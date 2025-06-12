export const metadata = {
  title: "Week in Review - June 16" ,
};

export default function WeekInReview0616() {
  return (
    <article className="prose mx-auto py-16">
      <h1>Week in Review</h1>
      <p>
        Here's an overview of everything that happened on PESOS during the last week. Most of these changes come straight from the
        <code>todo.md</code> tasks and the running notes in <code>chronicler.md</code>.
      </p>
      <ul>
        <li>Activity logging now tracks export requests and source management actions.</li>
        <li>The admin dashboard was simplified to pull recent logs from the API.</li>
        <li>Manual "Sync All Feeds" buttons were removed to keep backups fully automatic.</li>
        <li>We introduced a multi-step <code>/setup</code> wizard with sidebar navigation.</li>
        <li>An email signup flow landed along with a polished pricing page.</li>
        <li>Link Page and Hosted Page placeholders went live and a magazine preview was added.</li>
        <li>Prisma schema issues were fixed for the new LinkPage model.</li>
        <li>The admin dashboard gained real-time refresh and reusable pricing components.</li>
        <li>Finally, the Pro pricing card was simplified to just say "Coming soon!"</li>
      </ul>
      <p>
        The pace has been steady as we move toward that calm "archive robot" vision described in <code>end_state.md</code>. Check the main dashboard for a quiet status update, or browse the new pages for a peek at upcoming features.
      </p>
    </article>
  );
}
