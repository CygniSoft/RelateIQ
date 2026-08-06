import { LegalPage } from "./legal/LegalPage";

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="August 6, 2026">
      <section>
        <p>
          This Privacy Policy explains how RelateIQ+ ("we", "us") handles your
          information when you use the RelateIQ+ mobile app and this website
          (together, the "Service"). We built RelateIQ+ to be private by
          design: your contacts and notes live on your device, not on our
          servers.
        </p>
      </section>

      <section>
        <h2>Information stored on your device</h2>
        <p>
          The contacts you create, business cards you scan, notes, tags,
          reminders, and networking insights are stored locally on your device.
          We do not upload or keep a copy of your contact database on our
          servers. If you delete the app, this data is removed with it, so we
          recommend keeping your own backups where needed.
        </p>
      </section>

      <section>
        <h2>Information we process</h2>
        <ul>
          <li>
            <strong>Account information.</strong> When you sign up, our
            authentication provider (Clerk) processes your name, email address,
            and sign-in credentials so you can securely access the app.
          </li>
          <li>
            <strong>Business card images.</strong> When you scan a card, the
            image is sent to an AI service to extract the contact details, then
            the result is returned to your device. Images are processed to
            provide the feature and are not used to build advertising profiles.
          </li>
          <li>
            <strong>Intro emails.</strong> If you use the introduction email
            feature, the message content and recipient address are processed by
            our email delivery provider in order to send the email on your
            behalf, with replies going to your own email address.
          </li>
          <li>
            <strong>Payment information.</strong> Subscriptions are processed
            by Stripe. We never see or store your full card number. We keep a
            reference to your Stripe customer and subscription status so the
            app knows whether your Pro plan is active.
          </li>
          <li>
            <strong>Device permissions.</strong> The app requests access to
            your camera (to scan cards), your address book (only if you choose
            to save a contact to your phone), and notifications (only if you
            enable reminders). You can revoke these permissions at any time in
            your device settings.
          </li>
        </ul>
      </section>

      <section>
        <h2>What we do not do</h2>
        <ul>
          <li>We do not sell your personal information.</li>
          <li>We do not show third-party advertising.</li>
          <li>
            We do not read, mine, or share the contents of your contact
            database — it stays on your device.
          </li>
        </ul>
      </section>

      <section>
        <h2>Service providers</h2>
        <p>
          We rely on a small number of providers to run the Service:
          authentication (Clerk), payments (Stripe), email delivery, and AI
          processing for card scanning. Each provider receives only the
          information needed to perform its function and is bound by its own
          privacy and security commitments.
        </p>
      </section>

      <section>
        <h2>Data retention and deletion</h2>
        <p>
          Account and billing records are kept for as long as you have an
          account, and afterwards only as long as required for legal, tax, or
          accounting purposes. You can delete your on-device data at any time
          from within the app or by removing the app. To delete your account,
          contact us using the details below and we will remove your account
          data from our systems.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          We use industry-standard safeguards, including encrypted connections
          (HTTPS/TLS) between the app and our servers and reputable providers
          for authentication and payments. No method of transmission or
          storage is completely secure, but we work to protect your
          information using appropriate technical measures.
        </p>
      </section>

      <section>
        <h2>Children's privacy</h2>
        <p>
          The Service is not directed to children under 13 (or the equivalent
          minimum age in your jurisdiction), and we do not knowingly collect
          personal information from them.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. If we make
          material changes, we will update the date at the top of this page
          and, where appropriate, notify you in the app.
        </p>
      </section>

      <section>
        <h2>Contact us</h2>
        <p>
          If you have questions about this Privacy Policy or want to request
          deletion of your account, contact us through the support option in
          the RelateIQ+ app or via the support contact listed on our App Store
          page.
        </p>
      </section>
    </LegalPage>
  );
}
