import { processEventData } from "../utils/event-handler";
import { deleteFileOnGithub, fetchFileFromGithub } from "../utils/helpers";

const months: string[] = [
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

const stringToSlug = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .trim();
};

export const addEventService = async (parsedData: any): Promise<any> => {
  return await processEventData(parsedData);
};

export const updateEventService = async (
  parsedData: any,
  existingPath: string
): Promise<any> => {
  return await processEventData(parsedData, existingPath);
};

export const deleteEventService = async (
  title: string,
  publishDate: string
): Promise<{ message: string }> => {
  const publishDateObj = new Date(publishDate);
  const year = publishDateObj.getFullYear().toString();
  const month = months[publishDateObj.getMonth()];
  const titleSlug = stringToSlug(title);

  const filePath = `content/aktualnosci/${year}/${month}/${titleSlug}.json`;

  try {
    const fileData = await fetchFileFromGithub(filePath);
    const sha = fileData.sha;

    await deleteFileOnGithub(filePath, sha);

    return { message: "Event deleted successfully!" };
  } catch (error) {
    throw new Error("Event not found or could not be deleted.");
  }
};
