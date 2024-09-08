import { processEventData } from "@utils/event-handler";
import { fetchFileFromGithub, Image } from "@utils/helpers";
import { octokit } from "@utils/helpers.js";
import config from "@config";

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
  return await processEventData(parsedData, undefined);
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
): Promise<{ message: string; images?: Image[] }> => {
  const publishDateObj = new Date(publishDate);
  const year = publishDateObj.getFullYear().toString();
  const month = months[publishDateObj.getMonth()];
  const titleSlug = stringToSlug(title);

  const filePath = `content/aktualnosci/${year}/${month}/${titleSlug}.json`;

  try {
    console.log(
      `Attempting to fetch event file from GitHub at path: ${filePath}`
    );
    const fileData = await fetchFileFromGithub(filePath);
    console.log(`Fetched file data:`, fileData);
    const sha = fileData.sha;

    console.log(`Parsing JSON content to retrieve image paths.`);
    const content = JSON.parse(fileData.content);
    const images: Image[] =
      content.content.filter((item: any) => item.type === "image") || [];

    console.log(`Found ${images.length} images associated with the event.`);
    for (const image of images) {
      const imagePath = `public${image.src}`;
      console.log(
        `Attempting to fetch image file from GitHub at path: ${imagePath}`
      );

      try {
        const { sha: imageSha } = await fetchFileFromGithub(imagePath);
        console.log(
          `Fetched image file data for path: ${imagePath}, sha: ${imageSha}`
        );

        console.log(`Deleting image from GitHub at path: ${imagePath}`);
        await octokit.repos.deleteFile({
          owner: config.GITHUB_OWNER,
          repo: config.GITHUB_REPO,
          path: imagePath,
          message: `Delete image: ${imagePath}`,
          sha: imageSha,
          branch: "main",
        });
      } catch (error) {
        console.warn(`Image not found at path: ${imagePath}. Skipping...`);
        continue;
      }
    }

    console.log(`Deleting event JSON file from GitHub at path: ${filePath}`);
    await octokit.repos.deleteFile({
      owner: config.GITHUB_OWNER,
      repo: config.GITHUB_REPO,
      path: filePath,
      message: `Delete event JSON file: ${filePath}`,
      sha,
      branch: "main",
    });

    console.log(`Event and associated images deleted successfully.`);
    return { message: "Event deleted successfully!", images };
  } catch (error: any) {
    console.error("Error deleting event:", error.message);
    throw new Error("Event not found or could not be deleted.");
  }
};
