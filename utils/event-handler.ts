import path from "path";
import fs from "fs";
import { JSDOM } from "jsdom";
import { git } from "./git";
import { repoPath } from "./helpers";
import { ParsedData } from "../controllers/event";

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

export const processEventData = async (
  parsedData: ParsedData,
  existingPath?: string
) => {
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

  const imagesDirPath = path.join(repoPath, "public", "images", year, month);
  if (!fs.existsSync(imagesDirPath)) {
    fs.mkdirSync(imagesDirPath, { recursive: true });
  }

  const newFilePath = path.join(
    repoPath,
    "content",
    "aktualnosci",
    year,
    month,
    `${titleSlug}.json`
  );

  if (existingPath) {
    const existingFilePath = path.join(
      repoPath,
      "content",
      `${existingPath}.json`
    );
    if (fs.existsSync(existingFilePath)) {
      fs.unlinkSync(existingFilePath);
    }
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
          const imagePath = path.join(imagesDirPath, imageName);

          fs.writeFileSync(
            imagePath,
            imgSrc.split(";base64,").pop()!,
            "base64"
          );
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
        const imagePath = path.join(imagesDirPath, imageName);

        fs.writeFileSync(imagePath, imgSrc.split(";base64,").pop()!, "base64");
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

  fs.writeFileSync(newFilePath, JSON.stringify(fileContent, null, 2), "utf8");

  await git.add(newFilePath);
  await git.commit(
    existingPath ? `Update event: ${title}` : `Add event: ${title}`
  );
  await git.push();

  return {
    message: "Event processed and pushed successfully!",
    filePath: newFilePath,
  };
};
