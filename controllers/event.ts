import { Request, Response } from "express";
import {
  addEventService,
  updateEventService,
  deleteEventService,
} from "../services/event";
import path from "path";
import fs from "fs";

export interface ParsedData {
  title: string;
  eventDate: string;
  publishDate: string;
  description: string;
  mainHeading?: string;
  subHeading?: string;
  sectionHeading?: string;
  images?: Image[];
  thumbnail?: string;
}

export interface Image {
  type: string;
  src: string;
  alt: string;
}
const months = [
  "styczen",
  "luty",
  "marzec",
  "kwiecien",
  "maj",
  "czerwiec",
  "lipiec",
  "sierpien",
  "wrzesien",
  "pazdziernik",
  "listopad",
  "grudzien",
];
export const addEvent = async (req: Request, res: Response) => {
  try {
    const parsedData: any = {};
    req.body.forEach((item: any) => {
      parsedData[item.name] = Buffer.from(item.data).toString("utf8");
    });
    const result = await addEventService(parsedData);
    return res.json(result);
  } catch (error) {
    console.error("Error adding event:", error);
    res
      .status(500)
      .json({ error: "An error occurred while adding the event." });
  }
};

export const editEvent = async (req: Request, res: Response) => {
  try {
    const parsedData: any = {};
    req.body.forEach((item: any) => {
      parsedData[item.name] = Buffer.from(item.data).toString("utf8");
    });

    if (req.files && Array.isArray(req.files)) {
      parsedData.images = [];

      req.files.forEach((file: Express.Multer.File) => {
        const year = new Date(parsedData.eventDate).getFullYear().toString();
        const month = months[new Date(parsedData.eventDate).getMonth()];
        const imageName = `${Date.now()}-${file.originalname}`;
        const imagePath = path.join("public", "images", year, month, imageName);

        fs.renameSync(file.path, imagePath);

        const publicPath = `/images/${year}/${month}/${imageName}`;

        parsedData.images.push({
          type: "image",
          src: publicPath,
          alt: file.originalname,
        });

        if (!parsedData.thumbnail) {
          parsedData.thumbnail = publicPath;
        }
      });
    }

    const { path: existingPath } = parsedData;
    if (!existingPath) {
      return res
        .status(400)
        .json({ error: "Path is required for updating an event." });
    }

    const result = await updateEventService(parsedData, existingPath);
    return res.json(result);
  } catch (error) {
    console.error("Error updating event:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the event." });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { title, publishDate } = req.params;
    if (!title || !publishDate) {
      return res
        .status(400)
        .json({ error: "Title and publishDate are required." });
    }

    const result = await deleteEventService(title, publishDate);
    return res.json(result);
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "An error occurred during event deletion." });
  }
};
