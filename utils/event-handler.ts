import { JSDOM } from "jsdom";
import { ParsedData } from "../controllers/event";
import {
  createOrUpdateFileOnGithub,
  deleteFileOnGithub,
  fetchFileFromGithub,
} from "./helpers";

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

export const processEventData = async (
  parsedData: ParsedData,
  existingPath?: string
): Promise<{ message: string; filePath: string }> => {
  const {
    title,
    eventDate,
    publishDate,
    description,
    mainHeading,
    subHeading,
    sectionHeading,
    thumbnail: providedThumbnail,
  } = parsedData;

  if (!title || !eventDate || !publishDate || !description) {
    throw new Error(
      "Title, eventDate, publishDate, and description are required."
    );
  }

  const eventDateObj = new Date(eventDate);
  const year = eventDateObj.getFullYear().toString();
  const month = months[eventDateObj.getMonth()];
  const titleSlug = title
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-]/g, "")
    .toLowerCase();

  const newFilePath = `content/aktualnosci/${year}/${month}/${titleSlug}.json`;

  let existingFileSha: string | undefined = undefined;

  if (existingPath) {
    const existingFilePath = `content${existingPath}.json`;
    try {
      const existingFileData = await fetchFileFromGithub(existingFilePath);

      if (existingFileData && existingFileData.sha) {
        existingFileSha = existingFileData.sha;
        await deleteFileOnGithub(existingFilePath, existingFileData.sha);
      } else {
        console.error("Could not retrieve SHA for the existing file.");
        throw new Error("Could not retrieve SHA for the existing file.");
      }
    } catch (error) {
      console.error("Could not delete existing file:", error);
    }
  }

  try {
    const newFileData = await fetchFileFromGithub(newFilePath);
    if (newFileData && newFileData.sha) {
      existingFileSha = newFileData.sha;
    }
  } catch (error) {
    console.log(`File does not exist at new path: ${newFilePath}`);
  }

  let thumbnail = "";

  const dom = new JSDOM(description);
  const document = dom.window.document;
  const contentBlocks: any[] = [];

  document.body.childNodes.forEach((node: any, index: number) => {
    if (node.nodeName === "P") {
      const paragraphText = node.textContent.trim();
      if (paragraphText) {
        contentBlocks.push({ type: "paragraph", text: paragraphText });
      }

      const imgElements = node.querySelectorAll("img");
      imgElements.forEach((imgNode: any, imgIndex: number) => {
        const imgSrc = imgNode.getAttribute("src");

        if (imgSrc && imgSrc.startsWith("data:image")) {
          const extension = imgSrc.split(";")[0].split("/")[1];
          const imageName = `inline-image-${Date.now()}-${imgIndex}.${extension}`;
          const newSrc = `/images/${year}/${month}/${imageName}`;
          imgNode.setAttribute("src", newSrc);

          const imageObject = {
            type: "image",
            src: newSrc,
            alt: imgNode.getAttribute("alt") || "Inline image",
          };

          contentBlocks.push(imageObject);

          if (!thumbnail && providedThumbnail === imageName) {
            thumbnail = newSrc;
          }
        } else if (imgSrc) {
          const imageObject = {
            type: "image",
            src: imgSrc,
            alt: imgNode.getAttribute("alt") || "Inline image",
          };

          contentBlocks.push(imageObject);

          if (!thumbnail && providedThumbnail === imgSrc.split("/").pop()) {
            thumbnail = imgSrc;
          }
        }
      });
    } else if (node.nodeName === "IMG") {
      const imgSrc = node.getAttribute("src");

      if (imgSrc && imgSrc.startsWith("data:image")) {
        const extension = imgSrc.split(";")[0].split("/")[1];
        const imageName = `inline-image-${Date.now()}-${index}.${extension}`;
        const newSrc = `/images/${year}/${month}/${imageName}`;
        node.setAttribute("src", newSrc);

        const imageObject = {
          type: "image",
          src: newSrc,
          alt: node.getAttribute("alt") || "Inline image",
        };

        contentBlocks.push(imageObject);

        if (!thumbnail && providedThumbnail === imageName) {
          thumbnail = newSrc;
        }
      } else if (imgSrc) {
        const imageObject = {
          type: "image",
          src: imgSrc,
          alt: node.getAttribute("alt") || "Inline image",
        };

        contentBlocks.push(imageObject);

        if (!thumbnail && providedThumbnail === imgSrc.split("/").pop()) {
          thumbnail = imgSrc;
        }
      }
    }
  });

  const fileContent = {
    title,
    eventDate,
    publishDate,
    thumbnail,
    content: [
      ...(mainHeading
        ? [{ type: "heading", level: 1, text: mainHeading }]
        : []),
      ...(subHeading ? [{ type: "heading", level: 2, text: subHeading }] : []),
      ...(sectionHeading
        ? [{ type: "heading", level: 3, text: sectionHeading }]
        : []),
      ...contentBlocks,
    ],
  };

  try {
    await createOrUpdateFileOnGithub(
      newFilePath,
      JSON.stringify(fileContent, null, 2),
      existingFileSha
    );
  } catch (error) {
    throw new Error("Failed to create or update event file on GitHub.");
  }

  return {
    message: "Event processed and pushed successfully!",
    filePath: newFilePath,
  };
};
