import { JSDOM } from "jsdom";
import {
  fetchFileFromGithub,
  createOrUpdateFilesOnGithub,
  Image,
  ParsedData,
  octokit,
} from "@utils/helpers";
import config from "@config";

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
): Promise<{ message: string; filePath: string }> => {
  console.log(`Processing event data. Existing path: ${existingPath}`);
  const {
    title,
    eventDate,
    publishDate,
    description,
    mainHeading,
    subHeading,
    sectionHeading,
    mainImageOrder,
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
  let oldImages: Image[] = [];
  let thumbnail = "";

  if (existingPath) {
    const existingFilePath = `content${existingPath}.json`;
    try {
      console.log(`Fetching existing file data for: ${existingFilePath}`);
      const existingFileData = await fetchFileFromGithub(existingFilePath);

      if (existingFileData && existingFileData.sha) {
        existingFileSha = existingFileData.sha;
        const existingContent = JSON.parse(existingFileData.content);
        oldImages =
          existingContent.content.filter(
            (item: any) => item.type === "image"
          ) || [];

        if (existingContent.thumbnail) {
          thumbnail = existingContent.thumbnail;
        }
      } else {
        console.error("Could not retrieve SHA for the existing file.");
        throw new Error("Could not retrieve SHA for the existing file.");
      }
    } catch (error) {
      console.error("Could not prepare existing file for deletion:", error);
    }
  }

  const dom = new JSDOM(description);
  const document = dom.window.document;
  const contentBlocks: any[] = [];

  const filesToCommit: {
    path: string;
    content: string;
    message: string;
    isBinary?: boolean;
    sha?: string;
  }[] = [];

  const newImages: Set<string> = new Set();

  document.body.childNodes.forEach((node) => {
    if (node.nodeName === "P") {
      const paragraphText = node.textContent.trim();
      if (paragraphText) {
        contentBlocks.push({ type: "paragraph", text: paragraphText });
      }

      const imgElements = node.querySelectorAll("img");
      imgElements.forEach((imgNode, imgIndex) => {
        const imgSrc = imgNode.getAttribute("src");

        if (imgSrc && imgSrc.startsWith("data:image")) {
          const extension = imgSrc.split(";")[0].split("/")[1];
          const base64Data = imgSrc.split(",")[1];

          const imageName = `${titleSlug}-${Date.now()}-${imgIndex}.${extension}`;

          const newSrc = `/images/${year}/${month}/${imageName}`;

          console.log(
            `Preparing inline image for upload to GitHub: ${imageName}`
          );

          const imageBuffer = Buffer.from(base64Data, "base64");

          const imageContent = imageBuffer.toString("base64");

          filesToCommit.push({
            path: `public/images/${year}/${month}/${imageName}`,
            content: imageContent,
            message: `Add ${imageName}`,
            isBinary: true,
          });

          imgNode.setAttribute("src", newSrc);
          newImages.add(newSrc);

          const imageObject = {
            type: "image",
            src: newSrc,
            alt: imgNode.getAttribute("alt") || "Inline image",
          };

          contentBlocks.push(imageObject);
        } else if (imgSrc) {
          newImages.add(imgSrc);
          const imageObject = {
            type: "image",
            src: imgSrc,
            alt: imgNode.getAttribute("alt") || "Inline image",
          };

          contentBlocks.push(imageObject);
        }
      });
    } else if (node.nodeName === "IMG") {
      const imgSrc = node.getAttribute("src");

      if (imgSrc && imgSrc.startsWith("data:image")) {
        const extension = imgSrc.split(";")[0].split("/")[1];
        const base64Data = imgSrc.split(",")[1];
        const imageName = `inline-image-${Date.now()}-${imgIndex}.${extension}`;
        const newSrc = `/images/${year}/${month}/${imageName}`;

        console.log(
          `Preparing inline image for upload to GitHub: ${imageName}`
        );

        const imageBuffer = Buffer.from(base64Data, "base64");

        const imageContent = imageBuffer.toString("base64");

        filesToCommit.push({
          path: `public/images/${year}/${month}/${imageName}`,
          content: imageContent,
          message: `Add ${imageName}`,
          isBinary: true,
        });

        node.setAttribute("src", newSrc);
        newImages.add(newSrc);

        const imageObject = {
          type: "image",
          src: newSrc,
          alt: node.getAttribute("alt") || "Inline image",
        };

        contentBlocks.push(imageObject);
      } else if (imgSrc) {
        newImages.add(imgSrc);
        const imageObject = {
          type: "image",
          src: imgSrc,
          alt: node.getAttribute("alt") || "Inline image",
        };

        contentBlocks.push(imageObject);
      }
    }
  });

  if (mainImageOrder !== undefined && Number.isInteger(+mainImageOrder)) {
    const imageBlock = contentBlocks.filter((block) => block.type === "image")[
      mainImageOrder
    ];
    if (imageBlock) {
      thumbnail = imageBlock.src;
    }
  }
  if (existingPath && existingPath !== newFilePath.replace("content", "")) {
    try {
      const existingFilePath = `content${existingPath}.json`;
      console.log(`Deleting old event JSON file: ${existingFilePath}`);
      await octokit.repos.deleteFile({
        owner: config.GITHUB_OWNER,
        repo: config.GITHUB_REPO,
        path: existingFilePath,
        message: `Delete old event file: ${existingFilePath}`,
        sha: existingFileSha!,
        branch: "main",
      });
    } catch (error) {
      console.warn(`Failed to delete old event file: ${error.message}`);
    }
  }

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

  filesToCommit.push({
    path: newFilePath,
    content: JSON.stringify(fileContent, null, 2),
    message: "Update event content",
    sha: existingFileSha,
  });
  for (const oldImage of oldImages) {
    if (!newImages.has(oldImage.src)) {
      const imagePath = `public${oldImage.src}`;
      try {
        const { sha: imageSha } = await fetchFileFromGithub(imagePath);
        console.log(`Deleting old image from GitHub at path: ${imagePath}`);
        await octokit.repos.deleteFile({
          owner: config.GITHUB_OWNER,
          repo: config.GITHUB_REPO,
          path: imagePath,
          message: `Delete old image: ${imagePath}`,
          sha: imageSha,
          branch: "main",
        });
      } catch (error) {
        console.warn(`Old image not found at path: ${imagePath}. Skipping...`);
        continue;
      }
    }
  }

  await createOrUpdateFilesOnGithub(filesToCommit);
  console.log("Event and images successfully updated.");
  return {
    message: "Event processed and pushed successfully!",
    filePath: newFilePath,
  };
};
