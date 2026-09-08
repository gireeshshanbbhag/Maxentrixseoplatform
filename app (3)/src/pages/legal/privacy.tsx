export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2 text-sm">Last updated: September 1, 2026</p>
        </div>

        <div className="space-y-8 text-foreground">

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">1. Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              Maxentrix SEO Platform ("we", "us", "our") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, and safeguard your information
              when you use our Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">We collect the following types of information:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Account information:</strong> Name and email address
                provided when you sign in.
              </li>
              <li>
                <strong className="text-foreground">Project data:</strong> Website URLs, keywords, and
                SEO configuration you enter into the app.
              </li>
              <li>
                <strong className="text-foreground">Google API data:</strong> Search Console metrics,
                Analytics data, and performance data fetched from Google APIs on your behalf.
              </li>
              <li>
                <strong className="text-foreground">Usage data:</strong> How you interact with the Service,
                including pages visited and features used.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">We use your information to:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Provide, maintain, and improve the Service</li>
              <li>Display your SEO data, keyword rankings, and analytics within the app</li>
              <li>Send you notifications about significant changes to your website's SEO performance</li>
              <li>Respond to your support requests</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">4. Google API Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              Maxentrix SEO Platform's use and transfer of information received from Google APIs adheres to
              the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. Specifically:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>
                We only access Google data that is necessary to provide the SEO tracking features
                you have requested.
              </li>
              <li>
                We do not share your Google data with third parties except as necessary to provide
                the Service.
              </li>
              <li>
                We do not use your Google data for advertising or to train AI/ML models unrelated
                to providing the Service.
              </li>
              <li>
                You can revoke our access at any time via{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Google Account permissions
                </a>
                .
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">5. Data Storage and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored securely using industry-standard encryption. We implement
              appropriate technical and organizational measures to protect your information
              against unauthorized access, alteration, disclosure, or destruction.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              OAuth tokens used to access your Google data are stored encrypted and are only
              used to fetch the data you have authorized us to access.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active. You may delete your
              account and associated data at any time. Cached Google API data (e.g. Search
              Console metrics) is retained for up to 30 days to reduce unnecessary API calls.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">7. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal data. We do not share your data with third parties
              except in the following circumstances:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>With your consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect the rights and safety of our users and the public</li>
              <li>With service providers who assist in operating the Service (bound by confidentiality)</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent for Google data access at any time</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">9. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies and browser storage to maintain your session and
              remember your preferences. We do not use tracking or advertising cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of
              significant changes by displaying a notice in the app. Continued use of the
              Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">11. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or wish to exercise your rights,
              please contact us through the app.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t text-sm text-muted-foreground flex gap-4">
          <a href="/" className="hover:text-foreground transition-colors">Home</a>
          <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
        </div>
      </div>
    </div>
  );
}
