const {google}=require('googleapis')
// const path = require('path');
const fs = require('fs');
const express = require('express');
const app=express();
const cors=require('cors')
const Multer=require('multer');
const { Readable } = require('stream');
app.use(cors())
const multer = Multer({
    storage: Multer.memoryStorage({
        destination: function (req, file, callback) {
            callback(null, `${__dirname}/`);
        },
        filename: function (req, file, callback) {
            callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
        },
    }),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});
const authenticateGoogle = () => {
    const auth = new google.auth.GoogleAuth({
        keyFile: `${__dirname}/melodic-courier-364110-34110ebb710a.json`,
        scopes: "https://www.googleapis.com/auth/drive",
    });
    return auth;
};
const uploadToGoogleDrive = async (file, auth) => {
    const fileMetadata = {
        name: file.originalname,
        parents: ["1mT0PgxdAxU9Ov4lctunVyBLKIpbn8UUi"], // Change it according to your desired parent folder id
    };
   
    const media = {
      mimeType: file.mimetype,
      body: bufferStream(file.buffer),
    };
    
    const driveService = google.drive({ version: "v3", auth });
    
    const response = await driveService.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id",
    });
    return response;
};
app.post("/upload-file", multer.single("file"), async (req, res, next) => {
    console.log(req.file);
    try {
        if (!req.file) {
            res.status(400).send("No file uploaded.");
            return;
        }
        const auth = authenticateGoogle();
        const response = await uploadToGoogleDrive(req.file, auth);
        res.status(200).json({ response });
    } catch (err) {
        console.log(err);
    }
})
const bufferStream=(buffer)=>{
    const stream=new Readable()
    stream.push(buffer)
    stream.push(null)
    return stream;
}
    app.listen(8000,()=>{
       console.log("running");
    })