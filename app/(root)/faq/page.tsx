const faqs = [
  {
    question: "How does the interview get generated?",
    answer:
      "The app builds interviews from your selected role, inferred stack, saved settings, or resume data.",
  },
  {
    question: "Why do I see a fallback report sometimes?",
    answer:
      "If AI feedback generation fails, the app creates a deterministic report so the interview flow still completes.",
  },
  {
    question: "Can I practice full stack Java interviews?",
    answer:
      "Yes. The project now includes a full stack Java track with HTML, CSS, JavaScript, Java, SQL, MySQL, and NoSQL coverage.",
  },
  {
    question: "Where can I see my old questions?",
    answer:
      "Use the Question Bank page for deduplicated questions and Interview History for session-level review.",
  },
  {
    question: "Why is voice input not working?",
    answer:
      "Your browser may not support speech recognition or microphone permissions may be blocked. Typing still works.",
  },
  {
    question: "How do I improve my score?",
    answer:
      "Focus on the weakest category shown in feedback and analytics, then reattempt interviews in that same role or stack.",
  },
] as const;

const FAQPage = () => {
  return (
    <div className="flex flex-col gap-8">
      <section className="card-cta !py-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <h2>FAQ</h2>
          <p className="text-base">
            Common questions about interview generation, scoring, microphone support,
            and preparation flow.
          </p>
        </div>
      </section>

      <section className="grid gap-4">
        {faqs.map((item) => (
          <details key={item.question} className="card-border w-full">
            <summary className="card cursor-pointer list-none p-6 text-lg font-semibold text-white">
              {item.question}
            </summary>
            <div className="card px-6 pb-6 pt-0">
              <p>{item.answer}</p>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
};

export default FAQPage;
