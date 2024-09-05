import path from "path";
import fs from "fs";
import { processEventData } from "../utils/event-handler";
// import { git } from "../utils/git";
import { repoPath } from "../utils/helpers";

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

const stringToSlug = (str: string) => {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .trim();
};

export const addEventService = async (parsedData: any) => {
  return await processEventData(parsedData);
};

export const updateEventService = async (
  parsedData: any,
  existingPath: string
) => {
  return await processEventData(parsedData, existingPath);
};

export const deleteEventService = async (
  title: string,
  publishDate: string
) => {
  const publishDateObj = new Date(publishDate);
  const year = publishDateObj.getFullYear().toString();
  const month = months[publishDateObj.getMonth()];
  const titleSlug = stringToSlug(title);

  const filePath = path.join(
    repoPath,
    "content",
    "aktualnosci",
    year,
    month,
    `${titleSlug}.json`
  );
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    // await git.add(filePath);
    // await git.commit(`Delete event: ${title}`);
    // await git.push();

    return { message: "Event deleted successfully!" };
  } else {
    throw new Error("Event not found.");
  }
};
