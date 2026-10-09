import { RESET_DURATION_HOURS } from "../utils/config";

export function Privacy() {
  return (
    <section id="privacy" aria-labelledby="privacy-heading" className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
        <div>
          <h2 id="privacy-heading" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Privacy
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-muted">
            Here is what Doc2PPT does with your files, including what it does not do.
          </p>
        </div>
        <div className="space-y-6 leading-relaxed">
          <p className="border-l-4 border-mark pl-4">
            <strong>Your file is read in memory.</strong> When you upload a document, the Doc2PPT server reads its text
            and structure, then discards the file. It is not written to disk or saved in a database.
          </p>
          <div>
            <h3 className="text-lg font-semibold">How it works</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted marker:text-brand">
              <li>Your file is sent to the Doc2PPT server so its text can be read. It is not processed only in your browser.</li>
              <li>Your document is never sent to an outside AI service.</li>
              <li>Documents are not kept after processing, and their contents are not logged.</li>
              <li>There are no accounts, and Doc2PPT does not ask for your name, email or phone number.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold">About the free-generation limit</h3>
            <p className="mt-2 text-muted">
              Your remaining generations are kept in your browser's storage, not on a server. Clearing browser data or
              using another browser resets the count. That is an accepted trade-off so Doc2PPT does not need to track
              you. The count resets after {RESET_DURATION_HOURS} hours.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
