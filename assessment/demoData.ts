/**
 * Standalone-preview demo data (shown when the plugin is opened directly in a
 * browser instead of embedded in Sigma — e.g. the GitHub Pages URL). It mirrors
 * the PIF assurance dataset so the published page shows a meaningful chart:
 * platforms on the rows, each circle sitting in its assessment-stage column.
 */
export const DEMO_STAGE_NAME = "Stage";

// [platform, stage] — one row per platform, in the order they appear top→bottom.
export const DEMO_ROWS: Array<[string, string]> = [
  ["Unifonic", "Secure Design"],
  ["Fusion", "Secure Design"],
  ["Event Mgmt", "Secure Design"],
  ["Webex Meetings", "Secure Design"],
  ["DVP", "Security Assessments"],
  ["Key Mgmt", "Security Assessments"],
  ["GCP Foundation", "Security Assessments"],
  ["APIGEE GCP", "Security Assessments"],
  ["OpenShift", "Security Assessments"],
  ["Zoom", "Remediation"],
  ["Sponsorship", "Remediation"],
  ["SIFI", "Remediation"],
  ["Nexthink", "Remediation"],
  ["DAM", "Remediation"],
  ["AI Hub", "Remediation"],
  ["GitLab", "Remediation"],
  ["Splunk HF", "Remediation"],
  ["Ansible", "Remediation"],
  ["Red Hat IDM", "Remediation"],
  ["Publishing", "Remediation"],
  ["BarraOne", "Remediation"],
  ["AI Notetaker", "Remediation"],
];

export const DEMO_STAGE_ORDER = "Secure Design, Security Assessments, Remediation";
