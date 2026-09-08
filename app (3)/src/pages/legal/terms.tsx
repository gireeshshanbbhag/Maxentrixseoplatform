export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-muted-foreground mt-2 text-sm">Last updated: September 1, 2026</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-foreground">

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Maxentrix SEO Platform ("the Service"), you agree to be bound by
              these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Maxentrix SEO Platform is an SEO management platform that provides tools for keyword tracking,
              site audits, content optimization, performance analysis, and integration with Google Search
              Console and Google Analytics. The Service may connect to third-party APIs including Google
              APIs on your behalf with your explicit authorization.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">3. Google API Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Maxentrix SEO Platform uses Google APIs, including Google Search Console API and Google Analytics API.
              By connecting your Google account, you authorize us to access your Google Search Console and
              Analytics data on your behalf. Our use and transfer of information received from Google APIs
              adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You may revoke our access to your Google data at any time by disconnecting the integration
              within the app or by visiting your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Google Account permissions
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">4. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account and for all
              activities that occur under your account. You agree to notify us immediately of any
              unauthorized use of your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">5. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on the intellectual property rights of others</li>
              <li>Transmit any harmful, offensive, or disruptive content</li>
              <li>Attempt to gain unauthorized access to any systems or networks</li>
              <li>Use automated tools to scrape or extract data beyond normal usage</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">6. Data and Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of the Service is also governed by our{" "}
              <a href="/privacy" className="text-primary underline underline-offset-2">
                Privacy Policy
              </a>
              , which is incorporated into these Terms by reference.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided "as is" without warranties of any kind. We shall not be liable
              for any indirect, incidental, special, or consequential damages arising from your use
              of the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">8. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. Continued use of the Service
              after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">9. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms, please contact us through the app.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t text-sm text-muted-foreground flex gap-4">
          <a href="/" className="hover:text-foreground transition-colors">Home</a>
          <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}
