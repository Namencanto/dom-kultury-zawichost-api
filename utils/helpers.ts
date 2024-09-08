import { Octokit } from "@octokit/rest";
import config from "@config";

if (!config.GITHUB_OWNER || !config.GITHUB_REPO || !config.GITHUB_TOKEN) {
  throw new Error(
    "GitHub credentials are not properly configured in the .env file."
  );
}

export const octokit = new Octokit({
  auth: config.GITHUB_TOKEN,
});

export const createOrUpdateFilesOnGithub = async (
  files: {
    path: string;
    content: string;
    message: string;
    isBinary?: boolean;
    sha?: string;
  }[]
) => {
  const branch = "main";
  let jsonFileProcessed = false;

  for (const file of files) {
    if (!file.isBinary && file.path.endsWith(".json")) {
      jsonFileProcessed = true;
      await processJsonFile(file, branch);
    } else {
      await processBinaryFile(file);
    }
  }
};

const processJsonFile = async (
  file: {
    path: string;
    content: string;
    message: string;
  },
  branch: string
) => {
  const latestCommitSha = await getLatestCommitSha(branch, octokit);

  const treeSha = await createTree(
    latestCommitSha,
    [
      {
        path: file.path,
        mode: "100644",
        type: "blob",
        content: file.content,
      },
    ],
    octokit
  );

  const newCommitSha = await createCommit(
    latestCommitSha,
    treeSha,
    file.message,
    octokit
  );

  await updateRef(branch, newCommitSha, octokit);
};

const processBinaryFile = async (file: {
  path: string;
  content: string;
  message: string;
  sha?: string;
}) => {
  await octokit.repos.createOrUpdateFileContents({
    owner: config.GITHUB_OWNER,
    repo: config.GITHUB_REPO,
    path: file.path,
    message: file.message,
    content: file.content,
    sha: file.sha,
  });
};

export const fetchFileFromGithub = async (
  filePath: string
): Promise<{ sha: string; content: string }> => {
  const response = await octokit.repos.getContent({
    owner: config.GITHUB_OWNER,
    repo: config.GITHUB_REPO,
    path: filePath,
  });

  const data = response.data as {
    sha: string;
    content: string;
    encoding: string;
  };

  const decodedContent = Buffer.from(data.content, "base64").toString();
  return { sha: data.sha, content: decodedContent };
};

export const createCommit = async (
  parentSha: string,
  treeSha: string,
  message: string,
  octokit: Octokit
): Promise<string> => {
  const { data } = await octokit.git.createCommit({
    owner: config.GITHUB_OWNER,
    repo: config.GITHUB_REPO,
    message,
    tree: treeSha,
    parents: [parentSha],
  });

  return data.sha;
};

export const getLatestCommitSha = async (
  branch: string,
  octokit: Octokit
): Promise<string> => {
  const { data } = await octokit.git.getRef({
    owner: config.GITHUB_OWNER,
    repo: config.GITHUB_REPO,
    ref: `heads/${branch}`,
  });

  return data.object.sha;
};

export const createTree = async (
  baseTreeSha: string,
  files: {
    path: string;
    content: string;
    mode: string;
    type: string;
  }[],
  octokit: Octokit
): Promise<string> => {
  const tree = files.map((file) => ({
    path: file.path,
    mode: file.mode,
    type: file.type,
    content: file.content,
  }));

  const { data } = await octokit.git.createTree({
    owner: config.GITHUB_OWNER,
    repo: config.GITHUB_REPO,
    base_tree: baseTreeSha,
    tree,
  });

  return data.sha;
};

export const updateRef = async (
  branch: string,
  commitSha: string,
  octokit: Octokit
): Promise<void> => {
  await octokit.git.updateRef({
    owner: config.GITHUB_OWNER,
    repo: config.GITHUB_REPO,
    ref: `heads/${branch}`,
    sha: commitSha,
    force: true,
  });
};
