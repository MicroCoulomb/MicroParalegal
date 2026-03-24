"use client";

import { useDeferredValue, useState, useTransition } from "react";
import { jsPDF } from "jspdf";
import {
  DEFAULT_NDA_FORM,
  type NdaFormValues,
  buildPreviewDocument,
  buildDownloadFileName,
} from "@/lib/nda-template";

type FieldConfig = {
  name: keyof NdaFormValues;
  label: string;
  placeholder?: string;
  type?: "text" | "date" | "email";
};

const PARTY_FIELDS: FieldConfig[] = [
  { name: "partyOneCompany", label: "Party 1 company", placeholder: "Northstar Labs, Inc." },
  { name: "partyOneSigner", label: "Party 1 signer", placeholder: "Avery Stone" },
  { name: "partyOneTitle", label: "Party 1 title", placeholder: "Chief Executive Officer" },
  { name: "partyOneAddress", label: "Party 1 notice address", placeholder: "legal@northstarlabs.com" },
  { name: "partyTwoCompany", label: "Party 2 company", placeholder: "Harbor Peak LLC" },
  { name: "partyTwoSigner", label: "Party 2 signer", placeholder: "Jordan Lee" },
  { name: "partyTwoTitle", label: "Party 2 title", placeholder: "Managing Director" },
  { name: "partyTwoAddress", label: "Party 2 notice address", placeholder: "contracts@harborpeak.co" },
];

const AGREEMENT_FIELDS: FieldConfig[] = [
  { name: "purpose", label: "Purpose", placeholder: "Evaluating a potential strategic partnership." },
  { name: "effectiveDate", label: "Effective date", type: "date" },
  { name: "governingLaw", label: "Governing law", placeholder: "California" },
  {
    name: "jurisdiction",
    label: "Jurisdiction",
    placeholder: "courts located in San Francisco County, California",
  },
];

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: string;
  onChange: (name: keyof NdaFormValues, value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-stone-700">{field.label}</span>
      <input
        className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-600 focus:ring-4 focus:ring-amber-100"
        name={field.name}
        onChange={(event) => onChange(field.name, event.target.value)}
        placeholder={field.placeholder}
        type={field.type ?? "text"}
        value={value}
      />
    </label>
  );
}

export function NdaWorkspace() {
  const [values, setValues] = useState(DEFAULT_NDA_FORM);
  const [isPending, startTransition] = useTransition();
  const deferredValues = useDeferredValue(values);
  const previewDocument = buildPreviewDocument(deferredValues);

  function updateValue(name: keyof NdaFormValues, value: string) {
    startTransition(() => {
      setValues((current) => ({ ...current, [name]: value }));
    });
  }

  function downloadDocument() {
    const pdf = new jsPDF({
      format: "a4",
      unit: "pt",
    });
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const left = 56;
    const right = pageWidth - 56;
    const maxWidth = right - left;
    let y = 64;

    const addParagraph = (text: string, options?: { gapAfter?: number; indent?: number; size?: number }) => {
      const fontSize = options?.size ?? 11;
      const indent = options?.indent ?? 0;
      pdf.setFont("times", "normal");
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text, maxWidth - indent);

      for (const line of lines) {
        if (y > pageHeight - 64) {
          pdf.addPage();
          y = 64;
        }
        pdf.text(line, left + indent, y);
        y += fontSize + 5;
      }

      y += options?.gapAfter ?? 10;
    };

    const addHeading = (text: string, level: 1 | 2 | 3 = 2) => {
      const size = level === 1 ? 20 : level === 2 ? 14 : 12;
      pdf.setFont("times", "bold");
      pdf.setFontSize(size);
      if (y > pageHeight - 64) {
        pdf.addPage();
        y = 64;
      }
      pdf.text(text, left, y);
      y += size + 10;
    };

    addHeading("Mutual Non-Disclosure Agreement", 1);
    addHeading("Cover Page");
    addParagraph(
      'This Mutual Non-Disclosure Agreement (the "MNDA") consists of this Cover Page and the Common Paper Mutual NDA Standard Terms Version 1.0.',
      { gapAfter: 14 },
    );

    addHeading("Purpose", 3);
    addParagraph(previewDocument.purpose);
    addHeading("Effective Date", 3);
    addParagraph(previewDocument.effectiveDate);
    addHeading("MNDA Term", 3);
    addParagraph(`Expires ${previewDocument.ndaTermYears} year(s) from Effective Date.`);
    addHeading("Term of Confidentiality", 3);
    addParagraph(
      `${previewDocument.confidentialityTermYears} year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`,
    );
    addHeading("Governing Law & Jurisdiction", 3);
    addParagraph(`Governing Law: ${previewDocument.governingLaw}`, { gapAfter: 6 });
    addParagraph(`Jurisdiction: ${previewDocument.jurisdiction}`);
    addHeading("MNDA Modifications", 3);
    addParagraph(previewDocument.modifications);
    addHeading("Parties", 3);

    previewDocument.parties.forEach((party, index) => {
      addParagraph(`Party ${index + 1}: ${party.company}`, { gapAfter: 6, size: 12 });
      addParagraph(`Print Name: ${party.signer}`, { indent: 12, gapAfter: 4 });
      addParagraph(`Title: ${party.title}`, { indent: 12, gapAfter: 4 });
      addParagraph(`Notice Address: ${party.address}`, { indent: 12, gapAfter: 4 });
      addParagraph("Signature: ____________________", { indent: 12, gapAfter: 4 });
      addParagraph("Date: ____________________", { indent: 12, gapAfter: 10 });
    });

    addHeading("Standard Terms");
    previewDocument.standardTerms.forEach((section) => {
      addHeading(section.heading, 3);
      section.body.forEach((paragraph) => addParagraph(paragraph));
    });

    addParagraph(
      "Source basis: Common Paper Mutual Non-Disclosure Agreement Version 1.0 cover page and standard terms, adapted into a fillable PDF export for prototype use.",
      { gapAfter: 0, size: 10 },
    );

    pdf.save(buildDownloadFileName(values));
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.2),_transparent_32%),linear-gradient(180deg,_#fffaf0_0%,_#f5efe3_48%,_#efe6d7_100%)] px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-[2rem] border border-stone-200/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(120,53,15,0.12)] backdrop-blur">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
              MicroPrelegal
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950">
              Mutual NDA creator
            </h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Fill in the agreement details, review the live draft, then download a completed PDF
              locally.
            </p>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                Agreement details
              </h2>
              <div className="grid gap-4">
                {AGREEMENT_FIELDS.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    onChange={updateValue}
                    value={values[field.name]}
                  />
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                Parties
              </h2>
              <div className="grid gap-4">
                {PARTY_FIELDS.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    onChange={updateValue}
                    value={values[field.name]}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-stone-700">MNDA term (years)</span>
                <input
                  className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-600 focus:ring-4 focus:ring-amber-100"
                  min="1"
                  onChange={(event) => updateValue("ndaTermYears", event.target.value)}
                  type="number"
                  value={values.ndaTermYears}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-stone-700">
                  Confidentiality term (years)
                </span>
                <input
                  className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-600 focus:ring-4 focus:ring-amber-100"
                  min="1"
                  onChange={(event) => updateValue("confidentialityTermYears", event.target.value)}
                  type="number"
                  value={values.confidentialityTermYears}
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-stone-700">MNDA modifications</span>
              <textarea
                className="min-h-28 rounded-[1.5rem] border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-600 focus:ring-4 focus:ring-amber-100"
                onChange={(event) => updateValue("modifications", event.target.value)}
                placeholder="Optional business-specific modifications."
                value={values.modifications}
              />
            </label>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4 rounded-[1.5rem] bg-stone-900 px-5 py-4 text-stone-50">
            <div>
              <p className="text-sm font-medium">Download completed draft</p>
              <p className="text-xs text-stone-300">
                {isPending ? "Refreshing preview..." : "Preview is up to date."}
              </p>
            </div>
            <button
              className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-300"
              onClick={downloadDocument}
              type="button"
            >
              Download PDF
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-stone-200/80 bg-[linear-gradient(180deg,_#f7f3ec_0%,_#efe6d8_100%)] shadow-[0_24px_80px_rgba(120,53,15,0.12)]">
          <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
                Live draft
              </p>
              <h2 className="mt-2 text-xl font-semibold text-stone-900">
                Mutual Non-Disclosure Agreement
              </h2>
            </div>
            <div className="rounded-full border border-stone-300 bg-white/80 px-3 py-1 text-xs text-stone-600">
              Paper preview
            </div>
          </div>
          <div className="max-h-[calc(100vh-5rem)] overflow-y-auto p-6">
            <article className="mx-auto max-w-4xl rounded-[1.75rem] border border-stone-200 bg-white px-8 py-10 text-stone-900 shadow-[0_28px_60px_rgba(28,25,23,0.08)] sm:px-12">
              <header className="border-b border-stone-200 pb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-700">
                  Common Paper Prototype
                </p>
                <h2 className="mt-4 font-[family-name:var(--font-document)] text-4xl leading-tight">
                  Mutual Non-Disclosure Agreement
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
                  This Mutual Non-Disclosure Agreement (the &quot;MNDA&quot;) consists of this Cover Page
                  and the Common Paper Mutual NDA Standard Terms Version 1.0.
                </p>
              </header>

              <section className="grid gap-6 border-b border-stone-200 py-8 sm:grid-cols-2">
                <div className="rounded-[1.5rem] bg-stone-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Purpose
                  </p>
                  <p className="mt-3 font-[family-name:var(--font-document)] text-lg leading-8">
                    {previewDocument.purpose}
                  </p>
                </div>
                <div className="grid gap-4">
                  <div className="rounded-[1.5rem] border border-stone-200 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Effective date
                    </p>
                    <p className="mt-2 text-lg font-medium text-stone-900">
                      {previewDocument.effectiveDate}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-stone-200 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                        MNDA term
                      </p>
                      <p className="mt-2 text-lg font-medium text-stone-900">
                        {previewDocument.ndaTermYears} year(s)
                      </p>
                    </div>
                    <div className="rounded-[1.5rem] border border-stone-200 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                        Confidentiality
                      </p>
                      <p className="mt-2 text-lg font-medium text-stone-900">
                        {previewDocument.confidentialityTermYears} year(s)
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 border-b border-stone-200 py-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Governing law
                  </p>
                  <p className="mt-2 text-lg text-stone-900">{previewDocument.governingLaw}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Jurisdiction
                  </p>
                  <p className="mt-2 text-lg text-stone-900">{previewDocument.jurisdiction}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    MNDA modifications
                  </p>
                  <p className="mt-2 text-lg leading-8 text-stone-900">
                    {previewDocument.modifications}
                  </p>
                </div>
              </section>

              <section className="border-b border-stone-200 py-8">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <h3 className="font-[family-name:var(--font-document)] text-2xl">Parties</h3>
                  <span className="text-xs uppercase tracking-[0.2em] text-stone-400">
                    Signature block
                  </span>
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  {previewDocument.parties.map((party, index) => (
                    <section
                      key={party.company + index}
                      className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-6"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                        Party {index + 1}
                      </p>
                      <h4 className="mt-3 font-[family-name:var(--font-document)] text-2xl">
                        {party.company}
                      </h4>
                      <dl className="mt-5 space-y-4">
                        <div>
                          <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">
                            Print name
                          </dt>
                          <dd className="mt-1 text-base text-stone-900">{party.signer}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">
                            Title
                          </dt>
                          <dd className="mt-1 text-base text-stone-900">{party.title}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">
                            Notice address
                          </dt>
                          <dd className="mt-1 text-base leading-7 text-stone-900">
                            {party.address}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-8 space-y-5">
                        <div>
                          <div className="h-px bg-stone-300" />
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-stone-500">
                            Signature
                          </p>
                        </div>
                        <div>
                          <div className="h-px bg-stone-300" />
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-stone-500">
                            Date
                          </p>
                        </div>
                      </div>
                    </section>
                  ))}
                </div>
              </section>

              <section className="py-8">
                <h3 className="font-[family-name:var(--font-document)] text-2xl">Standard Terms</h3>
                <div className="mt-6 space-y-7">
                  {previewDocument.standardTerms.map((section) => (
                    <section key={section.heading}>
                      <h4 className="font-[family-name:var(--font-document)] text-xl text-stone-950">
                        {section.heading}
                      </h4>
                      <div className="mt-3 space-y-4">
                        {section.body.map((paragraph) => (
                          <p key={paragraph} className="text-[15px] leading-8 text-stone-700">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
