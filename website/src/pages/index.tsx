import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";
import CodeBlock from "@theme/CodeBlock";
import styles from "./index.module.css";

const SAMPLE = `import { game } from "./Stage";

let vy = 0;

whenFlag(() => {
  goTo(-200, -100);
  forever(() => {
    if (keyPressed("right arrow")) me.x += 5;
    if (keyPressed("left arrow")) me.x -= 5;
    vy -= 0.8;
    me.y += vy;
    if (touching("Level")) {
      me.y -= vy;
      vy = keyPressed("space") ? 12 : 0;
    }
    if (touching("Coin")) game.coins++;
  });
});`;

const FEATURES: { color: string; title: string; text: string }[] = [
  { color: "#4c97ff", title: "Real types", text: "Checked by the actual TypeScript compiler. Misspell a costume, sprite or sound name and you get an error before anything runs." },
  { color: "#9966ff", title: "Real Scratch", text: "The output is an ordinary Scratch project made of ordinary blocks. Open it, play it, share it, remix it." },
  { color: "#ffab19", title: "Code inside Scratch", text: "The browser extension adds a code editor right inside the Scratch editor. Draw in Scratch, code in text, press Build & Run." },
  { color: "#59c059", title: "Whole games", text: "Variables, lists, clones, broadcasts, custom blocks with return values, pen. Everything you need to finish a game without a single drag and drop." },
];

export default function Home(): ReactNode {
  return (
    <Layout title="Write Scratch in TypeScript" description="Write Scratch games in typed TypeScript and compile them to real Scratch blocks.">
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <h1>
              Write <span className={styles.ts}>TypeScript</span>
              <br />
              in <span className={styles.scratch}>Scratch</span>
            </h1>
            <p>
              TextToScratch compiles typed code into real Scratch blocks. Draw your sprites in Scratch, write the logic in text,
              and press <b>Build&nbsp;&amp;&nbsp;Run</b>.
            </p>
            <div className={styles.buttons}>
              <Link className={`button button--lg ${styles.solid}`} to="/docs/intro">Get started</Link>
              <Link className={`button button--lg ${styles.outline}`} to="/docs/platformer">Build a platformer</Link>
            </div>
          </div>
          <div className={styles.heroCode}>
            <CodeBlock language="ts" title="Player.ts">{SAMPLE}</CodeBlock>
          </div>
        </div>
      </header>
      <main>
        <section className={styles.features}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.feature} style={{ borderTopColor: f.color }}>
              <h3 style={{ color: f.color }}>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </section>
        <section className={styles.shot}>
          <h2>The editor lives inside Scratch</h2>
          <p>Your stage and sprites stay on the right. Your code goes where the blocks used to be.</p>
          <img src={useBaseUrl("/img/guide/build-run.jpg")} alt="The TextToScratch editor open inside the Scratch editor" />
        </section>
      </main>
    </Layout>
  );
}
