const TEAM_WORKSPACES = {};

TEAM_WORKSPACES.NAMES = {
  PRIVATE_WORKSPACE: "Private Workspace",
};

TEAM_WORKSPACES.PRIVATE_WORKSPACE = {
  name: TEAM_WORKSPACES.NAMES.PRIVATE_WORKSPACE,
  id: "private_workspace",
  accessCount: 1,
  color: "#1E69FF",
};

TEAM_WORKSPACES.NEW_WORKSPACE = {
  name: "Team Workspace",
  id: "new_workspace",
  accessCount: 1,
  color: "#585b58",
};

export default TEAM_WORKSPACES;
