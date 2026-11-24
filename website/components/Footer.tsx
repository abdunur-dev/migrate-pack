import { EXPRESS_GUIDE_URL, GITHUB_URL, NPM_URL } from "@/lib/docs";

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="frame">
          <span>
            migrate-pack · MIT license · <a href={GITHUB_URL}>GitHub</a> · <a href={NPM_URL}>npm</a>
          </span>
          <span>
            Not affiliated with the Express project. <a href={EXPRESS_GUIDE_URL}>Express 5 migration guide</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
