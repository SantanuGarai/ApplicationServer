const express = require("express");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
    res.send(
        "Hello From ARW! Here The Docker Image build on Jenkins server and pushed to Docker Hub. then Deployed on Application Server"
    );
});

app.listen(port, () => {
    console.log(`App running on port ${port}`);
});
