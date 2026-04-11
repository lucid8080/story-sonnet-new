const SUPPORT_EMAIL = 'support@sozoplay.com';

function getSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return 'https://sozoplay.com';
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProtocol).origin;
  } catch {
    return 'https://sozoplay.com';
  }
}

const linkClass =
  'font-medium text-primary underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-sm';

export default function PrivacyPolicyPage() {
  const siteOrigin = getSiteOrigin();

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-neutral-800">
      <h1 className="mb-6 text-3xl font-bold text-neutral-900">
        Privacy Policy
      </h1>

      <p className="mb-6">Last updated: April 10, 2026</p>

      <p className="mb-6">
        Welcome to <strong>Sozo Play</strong> (&quot;we,&quot; &quot;our,&quot; or
        &quot;us&quot;). We operate the website and related services available at{' '}
        <a href={siteOrigin} className={linkClass}>
          {siteOrigin}
        </a>{' '}
        (the &quot;Service&quot;). This Privacy Policy explains how we collect,
        use, disclose, and protect your information when you use our audio
        storytelling and listening platform, including features that may use
        artificial intelligence for content creation in authorized workflows.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          1. Information We Collect
        </h2>
        <p className="mb-4">
          We collect information that you provide directly to us, as well as
          information generated through your use of the Service.
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Account information:</strong> If you create an account, we may
            collect your name, email address, and authentication credentials. Sign-in
            is handled through <strong>NextAuth</strong> with email and password,
            and optionally <strong>Google</strong> OAuth when that provider is
            enabled for our deployment.
          </li>
          <li>
            <strong>Subscription and billing:</strong> Payments are processed by{' '}
            <strong>Stripe</strong>. We do not store full payment card numbers on our
            servers.
          </li>
          <li>
            <strong>User content:</strong> For authorized admin or creator tools
            (such as Story Studio), we may collect prompts, story text, character or
            setting inputs, and related metadata you submit so we can generate or
            edit audio stories. For typical listeners, we may store preferences,
            saved titles, and similar in-app choices tied to your account.
          </li>
          <li>
            <strong>Usage data:</strong> We collect information about how you
            interact with the Service—for example stories played, listening or
            engagement signals where we offer those features, pages visited, and
            general product analytics needed to run and improve the Service.
          </li>
          <li>
            <strong>Technical data:</strong> Such as IP address, device type, browser
            type, and coarse or inferred location derived from technical signals
            (not precise GPS from this policy alone).
          </li>
          <li>
            <strong>Cookies and similar technologies:</strong> We use cookies and
            similar technologies to maintain sessions (including NextAuth session
            cookies), protect the Service, and improve reliability and user
            experience.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          2. How We Use Your Information
        </h2>
        <p className="mb-4">We use the information we collect to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Provide, maintain, and improve the Service and its features.</li>
          <li>
            Process and deliver audio content, including AI-assisted generation where
            you use tools that send prompts to our model providers.
          </li>
          <li>Manage subscriptions, billing, and account status.</li>
          <li>
            Communicate with you about updates, security notices, and support
            requests.
          </li>
          <li>Monitor usage trends to improve performance, accessibility, and UX.</li>
          <li>Detect, investigate, and help prevent fraud, abuse, or security issues.</li>
          <li>Comply with legal obligations and enforce our terms.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          3. AI Processing and Third-Party Services
        </h2>
        <p className="mb-4">
          Parts of the Service rely on third-party providers. Depending on how you
          use Sozo Play, data may be processed by:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>OpenRouter</strong> (and underlying model providers) to process
            prompts and generate or refine story text for authorized workflows.
          </li>
          <li>
            <strong>ElevenLabs</strong> (or similar) for text-to-speech or narration
            generation when that feature is used.
          </li>
          <li>
            <strong>Stripe</strong> for payment processing and related fraud
            prevention signals handled by Stripe.
          </li>
          <li>
            <strong>NextAuth</strong> and your chosen identity provider (for example
            Google) for authentication when enabled.
          </li>
          <li>
            <strong>Hosting:</strong> Our Service is hosted on{' '}
            <strong>Vercel</strong>. Vercel&apos;s privacy policy describes data they
            process as an infrastructure and hosting provider. See{' '}
            <a
              href="https://vercel.com/legal/privacy-policy"
              className={linkClass}
              target="_blank"
              rel="noopener noreferrer"
            >
              Vercel&apos;s Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Media storage:</strong> Story artwork, audio, and related assets
            may be stored with cloud object storage providers (for example
            S3-compatible storage or similar) configured for our deployment.
          </li>
        </ul>
        <p className="mt-4">
          When you submit prompts or text to AI features, that content is sent to the
          applicable providers so they can return a result. Each provider applies its
          own technical and contractual terms; we select providers we believe meet
          reasonable security and privacy expectations for our use case.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          4. Training and Provider Policies
        </h2>
        <p className="mb-4">
          Third-party AI and speech providers maintain their own policies about
          logging, retention, and whether inputs may be used to improve their models.
          We do not use your personal User Content to train our own proprietary
          machine-learning models <strong>without your explicit consent</strong>.
        </p>
        <p>
          Because model behavior is governed in part by upstream vendors, you should
          review their documentation if you need vendor-specific assurances beyond
          this Policy.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          5. Operational Access to Your Information
        </h2>
        <p>
          Authorized members of our team and automated systems may access information
          you store in the Service—including drafts, generated stories, logs, and
          support tickets—as reasonably necessary to operate the Service, respond to
          support requests, prevent abuse or fraud, debug incidents, and comply with
          the law. We do not treat every creative draft as permanently hidden from
          all human review if access is required for these purposes.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          6. Sharing of Information
        </h2>
        <p className="mb-4">We do not sell your personal information.</p>
        <p className="mb-4">We may share information only:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>With service providers who process data on our behalf to run the Service.</li>
          <li>To comply with legal obligations or lawful requests.</li>
          <li>To protect the rights, safety, and integrity of our users and the public.</li>
          <li>
            In connection with a merger, acquisition, or sale of assets, subject to
            applicable law and notice requirements.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          7. Data Retention and Deletion
        </h2>
        <p className="mb-4">
          We retain personal data and User Content for as long as your account is
          active or as needed to provide the Service, comply with legal obligations,
          resolve disputes, and enforce our agreements.
        </p>
        <p>
          You may request deletion of your account and associated personal data by
          contacting us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
            {SUPPORT_EMAIL}
          </a>
          . We will respond in line with applicable law and verify requests where
          required.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          8. Your Rights
        </h2>
        <p className="mb-4">
          Depending on where you live (for example the EU/UK under GDPR or
          California under the CCPA/CPRA), you may have some or all of the following
          rights regarding personal data we hold about you:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Access:</strong> Request a copy of or information about the
            personal data we process.
          </li>
          <li>
            <strong>Correction:</strong> Request correction of inaccurate or
            incomplete data.
          </li>
          <li>
            <strong>Deletion:</strong> Request erasure of your personal data, subject
            to exceptions under law.
          </li>
          <li>
            <strong>Portability:</strong> Request a structured copy of certain data for
            transfer to another service, where technically feasible.
          </li>
          <li>
            <strong>Objection or restriction:</strong> Where applicable, object to or
            ask us to restrict certain processing.
          </li>
        </ul>
        <p className="mt-4">
          To exercise these rights, contact us using the information in Section 14. We
          may need to confirm your identity before fulfilling a request.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">9. Security</h2>
        <p>
          We implement technical and organizational measures designed to protect your
          information, including encryption in transit (such as HTTPS/TLS) for
          connections to the Service. No method of transmission or storage is
          completely secure; we cannot guarantee absolute security.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          10. Children&apos;s Privacy (COPPA and Families)
        </h2>
        <p className="mb-4">
          Sozo Play is designed for families and may be used alongside children under
          13 when a parent or guardian is involved. We take children&apos;s privacy
          seriously and aim to comply with applicable laws, including the
          Children&apos;s Online Privacy Protection Act (COPPA) where it applies.
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            We do{' '}
            <strong>
              not knowingly collect personal information directly from children
            </strong>{' '}
            without appropriate parental involvement.
          </li>
          <li>
            Accounts should be created and managed by a parent or guardian when the
            listener is a child.
          </li>
          <li>We limit collection to what we reasonably need to provide the Service.</li>
          <li>
            Parents or guardians may request access to or deletion of information
            associated with their family&apos;s use of the Service by contacting us.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          11. Cookies and Tracking
        </h2>
        <p>
          We use cookies and similar technologies to operate the Service, keep you
          signed in where you choose to stay logged in, and maintain reliability. We
          do not use behavioral advertising to profile children for ad targeting.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          12. International Users
        </h2>
        <p>
          If you access Sozo Play from outside your home country, your information may
          be transferred to, stored in, and processed in the United States or other
          countries where we or our service providers operate. Those countries may
          have different data protection rules than your jurisdiction.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          13. Changes to This Policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time. When we do, we will post
          the revised policy on this page and update the &ldquo;Last updated&rdquo;
          date above. Where required by law, we will provide additional notice.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">14. Contact Us</h2>
        <p className="mb-4">
          If you have questions about this Privacy Policy or wish to exercise your
          privacy rights, please contact us:
        </p>
        <ul className="list-none space-y-2 p-0">
          <li>
            Email:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
              {SUPPORT_EMAIL}
            </a>
          </li>
          <li>
            Website:{' '}
            <a href={siteOrigin} className={linkClass}>
              {siteOrigin}
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
