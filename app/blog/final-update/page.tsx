export const metadata = { title: "Final Update" };

export default function FinalUpdate() {
  return (
    <article className="prose mx-auto py-16">
      <h1>Wrapping Things Up</h1>
      <p>
        This release tries to hit every major goal in the end state file:
        a polished pricing page, a working email signup flow, and previews of
        Pro features like hosted link pages and a future magazine.
      </p>
      <p>
        Billing via Stripe and deeper notification preferences still need work,
        but the foundation is here. Check the new <code>/link</code> and
        <code>/hosted</code> paths for demos.
      </p>
      <p>
        Thanks for following along! You can leave your email on the subscribe
        page if you want updates as things progress.
      </p>
    </article>
  );
}
