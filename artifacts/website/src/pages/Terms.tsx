import { LegalPage } from "./legal/LegalPage";

export default function Terms() {
  return (
    <LegalPage title="Terms of Use" updated="August 6, 2026">
      <section>
        <p>
          These Terms of Use ("Terms") govern your use of the RelateIQ+ mobile
          app and this website (together, the "Service"). By creating an
          account or using the Service, you agree to these Terms. If you do
          not agree, please do not use the Service.
        </p>
      </section>

      <section>
        <h2>The Service</h2>
        <p>
          RelateIQ+ helps you capture business cards, organize professional
          contacts, and send introduction emails. Your contact data is stored
          on your device; certain features (such as card scanning, intro
          emails, and subscriptions) require an internet connection and an
          account.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>You must provide accurate information when creating an account.</li>
          <li>
            You are responsible for maintaining the confidentiality of your
            sign-in credentials and for all activity under your account.
          </li>
          <li>
            You must be at least 13 years old (or the minimum age required in
            your jurisdiction) to use the Service.
          </li>
        </ul>
      </section>

      <section>
        <h2>Subscriptions and billing</h2>
        <ul>
          <li>
            RelateIQ+ Pro is a paid subscription available monthly or yearly,
            billed in Canadian dollars through our payment provider, Stripe.
          </li>
          <li>
            Subscriptions renew automatically at the end of each billing period
            until cancelled. You can cancel at any time from the billing
            settings in the app; your plan remains active until the end of the
            current period.
          </li>
          <li>
            Except where required by law, payments are non-refundable and we do
            not provide refunds or credits for partial billing periods.
          </li>
          <li>
            Prices may change. If they do, we will give you reasonable advance
            notice before the change applies to your next renewal.
          </li>
        </ul>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>
            use the Service to send spam, unsolicited bulk email, or messages
            that are deceptive, unlawful, or harassing;
          </li>
          <li>
            upload content you do not have the right to use, or that infringes
            the rights of others;
          </li>
          <li>
            attempt to interfere with, disrupt, reverse engineer, or gain
            unauthorized access to the Service or its systems;
          </li>
          <li>use the Service in violation of applicable laws, including anti-spam and privacy laws that apply to the people whose details you collect.</li>
        </ul>
      </section>

      <section>
        <h2>Your content</h2>
        <p>
          You retain ownership of the content you create in the Service,
          including your contacts, notes, and messages. You grant us the
          limited rights needed to operate the Service — for example,
          processing a card image to extract contact details or transmitting
          an email you ask us to send. You are responsible for the content you
          submit and for having the right to store and use the contact details
          you collect.
        </p>
      </section>

      <section>
        <h2>Your data and backups</h2>
        <p>
          Your contact database is stored on your device rather than on our
          servers. Deleting the app deletes that data. You are responsible for
          maintaining backups of information that matters to you.
        </p>
      </section>

      <section>
        <h2>Third-party services</h2>
        <p>
          The Service relies on third-party providers such as Clerk
          (authentication), Stripe (payments), and AI and email providers.
          Their services are subject to their own terms, and we are not
          responsible for third-party services we do not control.
        </p>
      </section>

      <section>
        <h2>Disclaimer</h2>
        <p>
          The Service is provided "as is" and "as available" without
          warranties of any kind, express or implied. AI-extracted contact
          details may contain errors — please review them before relying on
          them. We do not warrant that the Service will be uninterrupted,
          error-free, or secure.
        </p>
      </section>

      <section>
        <h2>Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, we will not be liable for
          indirect, incidental, special, consequential, or punitive damages,
          or for loss of data, profits, or business, arising out of or related
          to your use of the Service. Our total liability for any claim
          relating to the Service is limited to the amount you paid us in the
          twelve months before the claim arose.
        </p>
      </section>

      <section>
        <h2>Termination</h2>
        <p>
          You may stop using the Service and cancel your subscription at any
          time. We may suspend or terminate access to the Service if you
          materially breach these Terms or where necessary to protect the
          Service or its users.
        </p>
      </section>

      <section>
        <h2>Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. If we make material
          changes, we will update the date at the top of this page and, where
          appropriate, notify you in the app. Continuing to use the Service
          after changes take effect means you accept the updated Terms.
        </p>
      </section>

      <section>
        <h2>Governing law</h2>
        <p>
          These Terms are governed by the laws of the Province of Ontario and
          the federal laws of Canada applicable therein, without regard to
          conflict-of-law rules.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these Terms? Contact us through the support option
          in the RelateIQ+ app or via the support contact listed on our App
          Store page.
        </p>
      </section>
    </LegalPage>
  );
}
