import React from "react";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold mt-32">What is PESOS?</h2>
        <p className="text-gray-700 leading-relaxed">
          PESOS stands for Publish Elsewhere, Syndicate (on your) Own Site.
        </p>
        <p>
          It's a way to take all the stuff you're posting all over the internet
          and pull it back into one simple, searchable, ownable, exportable
          place.
        </p>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">What's next</h2>
        <p className="text-gray-700 leading-relaxed">
          Right now, PESOS.site is a simple backup service. It's very much a
          prototype, and very few people use it. If you see anything wrong,{" "}
          <a href="mailto:jb@lot23.com">let me know</a>!
        </p>
        <p>
          In time, it may evolve into a platform where you can host your own
          personalized page, like if LinkTree pulled all your content together
          in one place with a searchable archive. But that may take some time.
        </p>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Who are you?</h2>
        <p className="text-gray-700 leading-relaxed">
          Kia Ora! My name is Jon and I live in windy Wellington, New Zealand. I
          love the web and I am trying to help make it a bit better. My website
          is at <a href="https://lot23.com">lot23.com</a>.
        </p>
      </section>
    </div>
  );
}
