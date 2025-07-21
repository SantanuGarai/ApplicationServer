pipeline {
    agent any // Runs on any available Jenkins agent

    environment {
        // Use the credentials ID you created in Jenkins
        DOCKER_CREDENTIALS = credentials('docker-hub-credentials')
        // Define your Docker Hub username and image name
        DOCKERHUB_USERNAME = "santanugarai"
        IMAGE_NAME = "applicationserver"
        TAG = "latest"
        APP_SERVER_IP       = "3.109.202.110"
        APP_SERVER_USER     = "ubuntu"
        SSH_KEY_CREDENTIALS = "jenkins-server-ssh-key"
    }

    stages {
        stage('Checkout Code') {
            steps {
                // Jenkins automatically checks out the code from the configured repository
                echo "Checking out source code..."
                git branch: 'main', url: 'https://github.com/SantanuGarai/CICDPipelineTest.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    // Build the Docker image and tag it with the build number
                    echo "Building Docker image..."
                    def dockerImage = docker.build("${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}")
               }
             
            }
        }

        stage('Push to Docker Hub') {
            steps {
                 withDockerRegistry([credentialsId: 'docker-hub-credentials', url: '']) {
                    script {
                        echo "pushing Docker image to docker hub..."
                        docker.image("${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}").push()
                    }
                }
            }
        }

        stage('Deploy New Container') {
            steps {
                echo "Deploying the new container..."
                sshagent([SSH_KEY_CREDENTIALS]) {
                        // Run commands on the remote server
                        sh """
                            ssh -o StrictHostKeyChecking=no ${APP_SERVER_USER}@${APP_SERVER_IP} '''
                                # Pull the new image
                                docker pull ${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}

                                # Stop and remove the old container if it exists
                                if [ \$(docker ps -q -f name=${IMAGE_NAME}) ]; then
                                    docker stop ${IMAGE_NAME} || true
                                    docker rm ${IMAGE_NAME} || true
                                fi

                                # Run the new container, mapping port 80 on the host to 8080 in the container
                                docker run -d --name ${IMAGE_NAME} -p 3000:3000 ${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}
                            '''
                        """
                    }
            }
        }
    }
}