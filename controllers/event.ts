import { Request, Response } from "express";
import {
  addEventService,
  updateEventService,
  deleteEventService,
} from "@services/event";
import dotenv from "dotenv";
dotenv.config();

export const addEvent = async (req: Request, res: Response) => {
  try {
    const parsedData: any = {};
    req.body.forEach((item: any) => {
      parsedData[item.name] = Buffer.from(item.data).toString("utf8");
    });

    const result = await addEventService(
      parsedData,
      req.files as Express.Multer.File[]
    );
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

    if (!parsedData.path) {
      return res
        .status(400)
        .json({ error: "Path is required for updating an event." });
    }

    const result = await updateEventService(
      parsedData,
      parsedData.path,
      req.files as Express.Multer.File[]
    );
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
    return res.json({ message: result.message });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "An error occurred during event deletion." });
  }
};
