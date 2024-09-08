import { Router } from "express";
import multer, { FileFilterCallback } from "multer";
import { addEvent, editEvent, deleteEvent } from "@controllers/event";

const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif"];

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb: FileFilterCallback) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images and GIFs are allowed."));
    }
  },
});

const router = Router();

router.post("/add-event", upload.any(), addEvent);
router.patch("/edit-event", upload.any(), editEvent);
router.delete("/delete-event/:title/:publishDate", deleteEvent);

export default router;
