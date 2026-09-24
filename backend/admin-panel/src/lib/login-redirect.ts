// Where to send an admin after login: the page they were trying to open
// (e.g. an "Edit in admin" link from a newsletter preview email), carried
// through the login screen as ?next=. Only same-app paths are accepted.
export function loginPathFor(path: string): string {
  if (!path.startsWith("/admin-new") || path.startsWith("/admin-new/login")) {
    return "/admin-new/login";
  }
  return `/admin-new/login?next=${encodeURIComponent(path)}`;
}

export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/admin-new/") || next.startsWith("//") || next.startsWith("/admin-new/login")) {
    return "/admin-new/";
  }
  return next;
}
