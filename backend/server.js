const { google } = require("googleapis");
// const path = require('path');
const fs = require("fs");
const express = require("express");
const app = express();
const cors = require("cors");
const Multer = require("multer");
const { Readable } = require("stream");
app.use(cors());
const multer = Multer({
  storage: Multer.memoryStorage({
    destination: function (req, file, callback) {
      callback(null, `${__dirname}/`);
    },
    filename: function (req, file, callback) {
      callback(
        null,
        file.fieldname + "_" + Date.now() + "_" + file.originalname
      );
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
const authenticateGoogle = () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: `${__dirname}/keys/melodic-courier-364110-34110ebb710a.json`,
    scopes: "https://www.googleapis.com/auth/drive",
  });
  return auth;
};
const searchFile= async (auth, folderName)=> {

  const service = google.drive({ version: "v3", auth });
  const files = [];
  const returnObject={isPresent: false, folderId: ""};
  try {
    const res = await service.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder'",
      spaces: "drive",
    });
    Array.prototype.push.apply(files, res.files);
    for(let i=0 ; i<res.data.files.length;i++) {
        if (res.data.files[i].name === folderName) {
          returnObject.isPresent=true;
          returnObject.folderId=res.data.files[i].id
       }
    }
    return returnObject;
  } catch (err) {
    // TODO(developer) - Handle error
    throw err;
  }
}
const createFolder = async (auth, folderName) => {
  const service = google.drive({ version: "v3", auth });
  const fileMetadata = {
    name: `${folderName}`,
    mimeType: "application/vnd.google-apps.folder",
    parents: ["1mT0PgxdAxU9Ov4lctunVyBLKIpbn8UUi"], // Change it according to your desired parent folder id
  };
  try {
    const file = await service.files.create({
      resource: fileMetadata,
      fields: "id",
    });
    console.log("Folder Id:", file.data.id);
    return file.data.id;
  } catch (err) {
    // TODO(developer) - Handle error
    throw err;
  }
};
const uploadToGoogleDrive = async (file, auth, newFolderId) => {
  const fileMetadata = {
    name: file.originalname,
    parents: [`${newFolderId}`], // Change it according to your desired parent folder id
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
});
app.post(
  "/createFolderAndUpload",
  multer.single("file"),
  async (req, res, next) => {
    const folderName = "omm";
    try {
      if (!req.file) {
        res.status(400).send("No file uploaded.");
        return;
      }
      const auth = authenticateGoogle();
      const resp = await searchFile(auth, folderName);
      if (resp.isPresent) {
        const response = await uploadToGoogleDrive(
          req.file,
          auth,
          resp.folderId
        );
        // res.status(200).json({ response });
        console.log("bas upload hua");
      } else {
        const newFolderId = await createFolder(auth, folderName);
        const response = await uploadToGoogleDrive(req.file, auth, newFolderId);
        // res.status(200).json({ response });
        console.log("folder bhi bana hai");
      }
    } catch (err) {
      console.log(err);
    }
  }
);
app.get("/create-folder", async (req, res, next) => {
  try {
    const auth = authenticateGoogle();
    const response = await createFolder(auth);
    res.status(200).json({ response });
  } catch (err) {
    console.log(err);
  }
});
app.get("/search-folder", async (req, res, next) => {
  const folder = "when";
  try {
    const auth = authenticateGoogle();
    const response = await searchFile(auth, folder);
    console.log(response);
    res.status(200).json({ response });
  } catch (err) {
    console.log(err);
  }
});
const bufferStream = (buffer) => {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
};
app.listen(7000, () => {
  console.log("running");
});
