import { getApi } from "../../store/actions";

export async function createRepoComment(
  repo: string,
  path: string,
  body: string,
  line: number
) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const response = await api.post(`/repos/${repo}/commits/HEAD/comments`, {
    body,
    path,
    line
  });
  return response.body;
}

export async function editRepoComment(repo: string, id: string, body: string) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  return api.patch(`/repos/${repo}/comments/${id}`, {
    body
  });
}

export async function deleteRepoComment(repo: string, id: string) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  return api.delete(`/repos/${repo}/comments/${id}`);
}

export async function getRepoComments(repo: string) {
  const GitHub = require("github-base");
  const api = await getApi(GitHub);

  const response = await api.get(`/repos/${repo}/comments`);
  return response.body;
}
