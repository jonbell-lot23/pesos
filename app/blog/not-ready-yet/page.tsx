export const metadata = {
  title: "What's Next - PESOS Blog",
};

export default function WhatsNextPost() {
  return (
    <article className="prose mx-auto py-16">
      <h1>Wrapping Up and Looking Ahead</h1>
      <p>
        I pushed hard to polish the core pieces: a shiny pricing page, an email
        signup form, and a place for future Pro features like the link page that
        won't suck. Some items still aren't wired up&mdash;billing via Stripe,
        the full LinkTree replacement, and real notification preferences. Those
        will take more work and testing.
      </p>
      <p>
        For now you can drop your email on the subscribe page and I'll reach out
        as soon as things are ready. I'm logging everything in
        <code>changelog.md</code> so the next agent knows exactly where we
        left off.
      </p>
      <p>Thanks for following along&mdash;stay tuned for the next milestone!</p>
    </article>
  );
}
