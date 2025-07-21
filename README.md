# ApplicationServer

This is the test application server to test CI CD pipeline with Jenkines, docker and github

Of course. Here is a comprehensive, line-by-line guide to building the CI/CD pipeline you've described. This process involves two servers: a Deployment Server running Jenkins and a separate Application Server where your application will run.

Conceptual Overview
Code Push: You push code changes to your GitHub repository.

Webhook Trigger: GitHub notifies your Jenkins server about the push via a webhook.

Jenkins Job Starts: Jenkins automatically starts a pre-configured pipeline job.

Build: Jenkins checks out your code, builds a new Docker image using a Dockerfile in your repo.

Push: Jenkins pushes this newly built image to your Docker Hub repository.

Deploy: Jenkins securely connects to your Application Server via SSH.

Run: On the Application Server, Jenkins pulls the new image from Docker Hub and starts a new container, replacing the old one.

Step 1: Configure the Deployment Server (Jenkins EC2)
This server will orchestrate the entire process. First, connect to it via SSH and run the following commands.

Update and Install Tools: Refresh your server's package list and install essential tools like Java (for Jenkins), Git, and Docker.

bash

# Update all system packages

sudo yum update -y

# Install Git

sudo yum install git -y

# Install Java Development Kit (JDK) 11, a Jenkins requirement

sudo amazon-linux-extras install java-openjdk11 -y

# Install Docker

sudo yum install docker -y
Install Jenkins: Add the Jenkins repository and install it.

bash

# Add the official Jenkins repository to your system

sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo

# Import the key to verify the repository's packages

sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key

# Install Jenkins

sudo yum install jenkins -y
Start Jenkins and Docker: Enable and start both services.

bash

# Enable Jenkins to start on boot

sudo systemctl enable jenkins

# Start the Jenkins service

sudo systemctl start jenkins

# Enable Docker to start on boot

sudo systemctl enable docker

# Start the Docker service

sudo systemctl start docker
Grant Jenkins Docker Permissions: Allow the jenkins user to execute Docker commands. This is a crucial step.

bash

# Add the 'jenkins' user to the 'docker' group

sudo usermod -aG docker jenkins

# Apply the group changes by restarting Jenkins

sudo systemctl restart jenkins
Initial Jenkins Setup:

Find the initial admin password:

bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
Open your web browser and navigate to http://<your-jenkins-ec2-ip>:8080.

Paste the password, click "Install suggested plugins," and create your admin user.

Go to Manage Jenkins > Plugins > Available and install Docker Pipeline and SSH Agent.

Step 2: Configure the Application Server (EC2)
This server's only job is to run your application inside a Docker container.

Install Docker: Connect to your application server via SSH and install Docker.

bash

# Update all system packages

sudo yum update -y

# Install Docker

sudo yum install docker -y

# Enable and start the Docker service

sudo systemctl enable docker
sudo systemctl start docker
Set Up SSH Key-Based Authentication: This allows your Jenkins server to log in to your Application Server without a password.

On the Jenkins Server, generate an SSH key pair for the jenkins user.

bash

# Switch to the jenkins user and generate the key

sudo -u jenkins ssh-keygen -t rsa -N "" -f /var/lib/jenkins/.ssh/id_rsa
On the Jenkins Server, display the public key and copy its entire output.

bash
sudo cat /var/lib/jenkins/.ssh/id_rsa.pub
On the Application Server, add the copied public key to the authorized_keys file.

bash

# Create the .ssh directory if it doesn't exist

mkdir -p ~/.ssh

# Paste the public key from the Jenkins server into this file

echo "PASTE_THE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys

# Set the correct permissions

chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
Step 3: Set Up Your GitHub Repository
Your repository needs two key files to tell Jenkins and Docker what to do.

Create a Dockerfile: This file is a blueprint for building your application's image. Create a file named Dockerfile in the root of your repository. Here is a simple example for a Node.js app.

text

# Start with a base image containing Node.js

FROM node:18-alpine

# Set the working directory inside the container

WORKDIR /app

# Copy dependency definitions

COPY package\*.json ./

# Install dependencies

RUN npm install

# Copy the rest of the application code

COPY . .

# Expose the port the app will run on

EXPOSE 8080

# The command to start the application

CMD ["node", "server.js"]
Create a Jenkinsfile: This file defines your entire CI/CD pipeline in code. Create a file named Jenkinsfile in the root of your repository.

groovy
// This Jenkinsfile defines the CI/CD pipeline
pipeline {
// Run on any available Jenkins agent
agent any

    // Environment variables used throughout the pipeline
    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-credentials')
        DOCKER_IMAGE_NAME   = "your-dockerhub-username/your-repo-name"
        APP_SERVER_IP       = "your-app-server-private-ip"
        APP_SERVER_USER     = "ec2-user"
        SSH_KEY_CREDENTIALS = "app-server-ssh-key"
    }

    stages {
        // Stage 1: Checkout code from GitHub
        stage('Checkout') {
            steps {
                echo 'Checking out the code...'
                git branch: 'main', url: 'https://github.com/your-username/your-repo-name.git'
            }
        }

        // Stage 2: Build the Docker image
        stage('Build Image') {
            steps {
                script {
                    echo "Building Docker image: ${DOCKER_IMAGE_NAME}:${env.BUILD_NUMBER}"
                    // Build the image and tag it with the unique build number
                    docker.build("${DOCKER_IMAGE_NAME}:${env.BUILD_NUMBER}", '.')
                }
            }
        }

        // Stage 3: Push the image to Docker Hub
        stage('Push to Docker Hub') {
            steps {
                script {
                    echo "Logging in and pushing image..."
                    // Authenticate to Docker Hub using stored credentials
                    docker.withRegistry('https://registry.hub.docker.com', DOCKERHUB_CREDENTIALS) {
                        // Push the tagged image
                        docker.image("${DOCKER_IMAGE_NAME}:${env.BUILD_NUMBER}").push()
                    }
                }
            }
        }

        // Stage 4: Deploy the new image to the application server
        stage('Deploy to Application Server') {
            steps {
                script {
                    echo "Deploying to production..."
                    // Use the SSH Agent plugin to securely connect
                    sshagent([SSH_KEY_CREDENTIALS]) {
                        // Run commands on the remote server
                        sh """
                            ssh -o StrictHostKeyChecking=no ${APP_SERVER_USER}@${APP_SERVER_IP} '''
                                # Pull the new image
                                docker pull ${DOCKER_IMAGE_NAME}:${env.BUILD_NUMBER}

                                # Stop and remove the old container if it exists
                                if [ \$(docker ps -q -f name=my-app) ]; then
                                    docker stop my-app
                                    docker rm my-app
                                fi

                                # Run the new container, mapping port 80 on the host to 8080 in the container
                                docker run -d --name my-app -p 80:8080 ${DOCKER_IMAGE_NAME}:${env.BUILD_NUMBER}
                            '''
                        """
                    }
                }
            }
        }
    }

    post {
        // This block runs after all stages complete
        always {
            echo 'Pipeline finished.'
            // Clean up the Jenkins workspace
            cleanWs()
        }
    }

}
Important: Remember to replace all placeholder values (like your-dockerhub-username) in the Jenkinsfile with your actual information.

Set Up GitHub Webhook:

In your GitHub repo, go to Settings > Webhooks > Add webhook.

Payload URL: http://<your-jenkins-ec2-ip>:8080/github-webhook/

Content type: application/json

Select "Just the push event."

Click Add webhook.

Step 4: Configure Credentials in Jenkins
Never hardcode passwords or keys in your Jenkinsfile. Store them securely in Jenkins.

Docker Hub Credentials:

In Jenkins, go to Manage Jenkins > Credentials > System > Global credentials > Add Credentials.

Kind: Username with password.

Username: Your Docker Hub username.

Password: Your Docker Hub password or access token.

ID: dockerhub-credentials. This ID must match the one in your Jenkinsfile.

Application Server SSH Key:

On the Jenkins Server, get the private key you created earlier.

bash
sudo cat /var/lib/jenkins/.ssh/id_rsa
In Jenkins, go to Manage Jenkins > Credentials > System > Global credentials > Add Credentials.

Kind: SSH Username with private key.

ID: app-server-ssh-key.

Username: ec2-user (or the user for your application server).

Private Key: Select Enter directly and paste the entire private key, including the -----BEGIN RSA PRIVATE KEY----- and -----END RSA PRIVATE KEY----- lines.

Step 5: Create the Pipeline Job in Jenkins
Finally, create the Jenkins job that will use your Jenkinsfile.

On the Jenkins dashboard, click New Item.

Enter a name for your pipeline (e.g., "my-app-pipeline"), select Pipeline, and click OK.

Scroll down to the Pipeline section.

Change the Definition to Pipeline script from SCM.

SCM: Select Git.

Repository URL: Enter the HTTPS URL of your GitHub repository.

Branch Specifier: Set to _/main or _/master, depending on your default branch name.

Script Path: Ensure it is Jenkinsfile.

Click Save.

Your CI/CD pipeline is now fully configured. When you git push a change to your GitHub repository's main branch, the webhook will trigger Jenkins, which will execute the stages in your Jenkinsfile to build, push, and deploy your application automatically. You can monitor the progress of each build in the Jenkins UI.
