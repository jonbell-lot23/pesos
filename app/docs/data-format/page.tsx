export const metadata = { title: "Data Export Formats" };
export const dynamic = "force-static";

export default function DataFormatDoc() {
  return (
    <article className="prose mx-auto py-16">
      <h1>Data Export Formats</h1>
      <p>PESOS lets you download your archived data at any time. Exports are available in three formats:</p>
      <h2>JSON</h2>
      <ul>
        <li>Complete representation of your user profile, connected sources and saved items.</li>
        <li>Ideal for backing up or importing into other tools.</li>
      </ul>
      <h2>Markdown</h2>
      <ul>
        <li>A readable summary where each item becomes a Markdown entry.</li>
        <li>Great for publishing or quick reviews.</li>
      </ul>
      <h2>CSV</h2>
      <ul>
        <li>Tabular data containing the same fields as the JSON export.</li>
        <li>Useful for spreadsheets or custom scripts.</li>
      </ul>
      <p>All exports contain only your own content and can be generated from the dashboard. No additional authentication steps are required beyond being logged in.</p>
    </article>
  );
}
