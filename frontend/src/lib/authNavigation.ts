import type { NavigateFunction } from "react-router-dom";

/** Public CTAs: signed-in users go to the app hub instead of the login page. */
export function goSignInOrDashboard(navigate: NavigateFunction, loggedIn: boolean): void {
  navigate(loggedIn ? "/dashboard" : "/login");
}
