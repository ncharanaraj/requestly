import { trackEvent } from "modules/analytics";
import { SETTINGS } from "./constants";

export const trackAppSettingsViewed = (action: string, source: string) => {
  trackEvent(SETTINGS.APP_SETTINGS_VIEWED, { action, source });
};

export const trackAppSettingsSidebarClicked = (action: string) => {
  trackEvent(SETTINGS.APP_SETTINGS_SIDEBAR_CLICKED, { action });
};

export const trackBillingTeamViewed = (email_status: string, count_my_teams: number, role: string) => {
  trackEvent(SETTINGS.BILLING.BILLING_TEAM_VIEWED, { email_status, count_my_teams, role });
};

export const trackBillingTeamNavigated = (navigated_to: string) => {
  trackEvent(SETTINGS.BILLING.BILLING_TEAM_NAVIGATED, { navigated_to });
};

export const trackBillingTeamActionClicked = (action: string) => {
  trackEvent(SETTINGS.BILLING.BILLING_TEAM_ACTION_CLICKED, { action });
};

export const trackBillingTeamNoMemberFound = (reason: string, source: string) => {
  trackEvent(SETTINGS.BILLING.BILLING_TEAM_NO_MEMBER_FOUND, { reason, source });
};

export const trackBillingTeamMemberAdded = (email: string, team_id: string) => {
  trackEvent(SETTINGS.BILLING.BILLIG_TEAM_MEMBER_ADDED, { email, team_id });
};

export const trackBillingTeamMemberRemoved = (email: string, team_id: string) => {
  trackEvent(SETTINGS.BILLING.BILLING_TEAM_MEMBER_REMOVED, { email, team_id });
};

export const trackBillingTeamRoleChanged = (email: string, new_role: string, team_id: string) => {
  trackEvent(SETTINGS.BILLING.BILLING_TEAM_ROLE_CHANGED, { email, new_role, team_id });
};

export const trackWorkspaceSettingsGoToBillingTeamClicked = (workspace_id: string) => {
  trackEvent(SETTINGS.WORKSPACE.WORKSPACE_SETTINGS_GO_TO_BILLING_TEAM_CLICKED, { workspace_id });
};

export const trackWorkspaceSettingsLearnMoreClicked = (workspace_id: string) => {
  trackEvent(SETTINGS.WORKSPACE.WORKSPACE_SETTINGS_LEARN_MORE_CLICKED, { workspace_id });
};

export const trackWorkspaceSettingsAutomaticMappingToggleClicked = (workspace_id: string, final_status: boolean) => {
  trackEvent(SETTINGS.WORKSPACE.WORKSPACE_SETTINGS_AUTOMATIC_MAPPING_TOGGLE_CLICKED, { final_status, workspace_id });
};

export const trackPersonalSubscriptionDownloadInvoicesClicked = () => {
  trackEvent(SETTINGS.BILLING.BILLING_PERSONAL_SUBSCRIPTION_DOWNLOAD_INVOICES_CLICKED);
};
