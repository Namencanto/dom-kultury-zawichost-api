import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export interface GithubFileData {
  sha: string;
  content?: string;
  encoding?: string;
}

export interface GithubFileResult {
  sha: string;
  content: any;
}

export const fetchFileFromGithub = async (
  filePath: string
): Promise<GithubFileResult> => {
  const url = `${GITHUB_API_BASE_URL}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${GITHUB_TOKEN}`,
    },
  });
  console.log(response);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from GitHub: ${response.statusText}`);
  }

  const data: GithubFileData = await response.json();

  if (data.content && data.encoding === "base64") {
    const decodedContent = Buffer.from(data.content, "base64").toString(
      "utf-8"
    );

    try {
      const parsedContent = JSON.parse(decodedContent);
      console.log("Decoded and parsed content:", parsedContent);
      return { sha: data.sha, content: parsedContent };
    } catch (error) {
      console.error("Failed to parse JSON content:", error);
      throw new Error("Failed to parse JSON content.");
    }
  } else {
    console.log("File content is not base64 encoded or not present.");
    throw new Error("File content is not base64 encoded or not present.");
  }
};

export const deleteFileOnGithub = async (
  filePath: string,
  sha: string
): Promise<void> => {
  const url = `${GITHUB_API_BASE_URL}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
  console.log(url);
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${GITHUB_TOKEN}`,
    },
    body: JSON.stringify({
      message: `Delete event: ${filePath}`,
      sha: sha,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete file on GitHub: ${response.statusText}`);
  }
};

export const createOrUpdateFileOnGithub = async (
  filePath: string,
  content: string,
  sha?: string
): Promise<void> => {
  const url = `${GITHUB_API_BASE_URL}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
  const body: any = {
    message: sha ? `Update file: ${filePath}` : `Create file: ${filePath}`,
    content: Buffer.from(content).toString("base64"),
  };

  if (sha) body.sha = sha;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${GITHUB_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create or update file on GitHub: ${response.statusText}`
    );
  }
};
