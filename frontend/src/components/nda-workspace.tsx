"use client";

import { useDeferredValue, useState, useTransition } from "react";
import { jsPDF } from "jspdf";
import {
  DEFAULT_NDA_FORM,
  type NdaFormValues,
  buildDownloadFileName,
  buildPreviewDocument,
} from "@/lib/nda-template";

type ChatMessage = {
  content: string;
  role: "assistant" | "user";
};

type ChatTurnResponse = {
  assistantMessage: string;
  draft: NdaFormValues;
  isComplete: boolean;
  missingFields: string[];
};

const INITIAL_ASSISTANT_MESSAGE =
  "I'll draft a Mutual NDA for you. Tell me who the two parties are and what purpose the NDA should cover, and I'll ask follow-up questions as needed.";
const INITIAL_MISSING_FIELDS = [
  "Party 1 company",
  "Party 1 signer",
  "Party 1 title",
  "Party 1 notice address",
  "Party 2 company",
  "Party 2 signer",
  "Party 2 title",
  "Party 2 notice address",
  "Purpose",
  "Effective date",
  "Governing law",
  "Jurisdiction",
];

function isChatTurnResponse(payload: unknown): payload is ChatTurnResponse {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "assistantMessage" in payload &&
    "draft" in payload &&
    "missingFields" in payload &&
    "isComplete" in payload
  );
}

function NdaPreviewPaper({ previewDocument }: { previewDocument: ReturnType<typeof buildPreviewDocument> }) {
  return (
    <article className="mx-auto max-w-4xl rounded-[1.75rem] border border-[#e7e5e4] bg-white px-8 py-10 text-[#1c1917] shadow-[0_28px_60px_rgba(28,25,23,0.08)] sm:px-12">
      <header className="border-b border-[#e7e5e4] pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#b45309]">
          Common Paper Prototype
        </p>
        <h2 className="mt-4 font-[family-name:var(--font-document)] text-4xl leading-tight">
          Mutual Non-Disclosure Agreement
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#57534e]">
          This Mutual Non-Disclosure Agreement (the &quot;MNDA&quot;) consists of this Cover Page and
          the Common Paper Mutual NDA Standard Terms Version 1.0.
        </p>
      </header>

      <section className="grid gap-6 border-b border-[#e7e5e4] py-8 sm:grid-cols-2">
        <div className="rounded-[1.5rem] bg-[#fafaf9] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78716c]">Purpose</p>
          <p className="mt-3 font-[family-name:var(--font-document)] text-lg leading-8">
            {previewDocument.purpose}
          </p>
        </div>
        <div className="grid gap-4">
          <div className="rounded-[1.5rem] border border-[#e7e5e4] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78716c]">
              Effective date
            </p>
            <p className="mt-2 text-lg font-medium text-[#1c1917]">{previewDocument.effectiveDate}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[#e7e5e4] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78716c]">
                MNDA term
              </p>
              <p className="mt-2 text-lg font-medium text-[#1c1917]">
                {previewDocument.ndaTermYears} year(s)
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[#e7e5e4] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78716c]">
                Confidentiality
              </p>
              <p className="mt-2 text-lg font-medium text-[#1c1917]">
                {previewDocument.confidentialityTermYears} year(s)
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-b border-[#e7e5e4] py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78716c]">
            Governing law
          </p>
          <p className="mt-2 text-lg text-[#1c1917]">{previewDocument.governingLaw}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78716c]">
            Jurisdiction
          </p>
          <p className="mt-2 text-lg text-[#1c1917]">{previewDocument.jurisdiction}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78716c]">
            MNDA modifications
          </p>
          <p className="mt-2 text-lg leading-8 text-[#1c1917]">{previewDocument.modifications}</p>
        </div>
      </section>

      <section className="border-b border-[#e7e5e4] py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h3 className="font-[family-name:var(--font-document)] text-2xl">Parties</h3>
          <span className="text-xs uppercase tracking-[0.2em] text-[#a8a29e]">Signature block</span>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {previewDocument.parties.map((party, index) => (
            <section
              key={party.company + index}
              className="rounded-[1.5rem] border border-[#e7e5e4] bg-[#fafaf9] p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b45309]">
                Party {index + 1}
              </p>
              <h4 className="mt-3 font-[family-name:var(--font-document)] text-2xl">
                {party.company}
              </h4>
              <dl className="mt-5 space-y-4">
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-[#78716c]">Print name</dt>
                  <dd className="mt-1 text-base text-[#1c1917]">{party.signer}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-[#78716c]">Title</dt>
                  <dd className="mt-1 text-base text-[#1c1917]">{party.title}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-[#78716c]">
                    Notice address
                  </dt>
                  <dd className="mt-1 text-base leading-7 text-[#1c1917]">{party.address}</dd>
                </div>
              </dl>
              <div className="mt-8 space-y-5">
                <div>
                  <div className="h-px bg-[#d6d3d1]" />
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#78716c]">
                    Signature
                  </p>
                </div>
                <div>
                  <div className="h-px bg-[#d6d3d1]" />
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#78716c]">Date</p>
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
              <h4 className="font-[family-name:var(--font-document)] text-xl text-[#0c0a09]">
                {section.heading}
              </h4>
              <div className="mt-3 space-y-4">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-[15px] leading-8 text-[#44403c]">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </article>
  );
}

export function NdaWorkspace() {
  const [draft, setDraft] = useState(DEFAULT_NDA_FORM);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: INITIAL_ASSISTANT_MESSAGE },
  ]);
  const [composerValue, setComposerValue] = useState("");
  const [missingFields, setMissingFields] = useState<string[]>(INITIAL_MISSING_FIELDS);
  const [isComplete, setIsComplete] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredDraft = useDeferredValue(draft);
  const previewDocument = buildPreviewDocument(deferredDraft);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const userMessage = composerValue.trim();
    if (!userMessage || isSending) {
      return;
    }

    const previousMessages = messages;
    const nextMessages: ChatMessage[] = [...previousMessages, { role: "user", content: userMessage }];
    setComposerValue("");
    setErrorMessage(null);
    setMessages(nextMessages);
    setIsSending(true);

    try {
      const response = await fetch("/api/nda/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draft,
          messages: nextMessages,
        }),
      });

      const payload: unknown = await response.json();
      if (!response.ok || !isChatTurnResponse(payload)) {
        const detail =
          typeof payload === "object" && payload !== null && "detail" in payload
            ? String(payload.detail)
            : "Unable to generate the next NDA drafting step.";
        throw new Error(detail);
      }

      startTransition(() => {
        setDraft(payload.draft);
        setMissingFields(payload.missingFields);
        setIsComplete(payload.isComplete);
      });
      setMessages([...nextMessages, { role: "assistant", content: payload.assistantMessage }]);
    } catch (error) {
      setMessages(previousMessages);
      setComposerValue(userMessage);
      setErrorMessage(error instanceof Error ? error.message : "Unable to generate the next NDA drafting step.");
    } finally {
      setIsSending(false);
    }
  }

  async function downloadDocument() {
    if (isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const pdf = new jsPDF({
        format: "a4",
        orientation: "portrait",
        unit: "pt",
      });

      const palette = {
        accent: [180, 83, 9] as const,
        border: [231, 229, 228] as const,
        panel: [250, 250, 249] as const,
        text: [28, 25, 23] as const,
        muted: [120, 113, 108] as const,
        subtle: [87, 83, 78] as const,
      };
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageMargin = 28;
      const contentWidth = pageWidth - pageMargin * 2;
      const gap = 14;
      const cardRadius = 12;
      let y = pageMargin;

      const applyTextColor = (tone: keyof typeof palette) => {
        const [r, g, b] = palette[tone];
        pdf.setTextColor(r, g, b);
      };

      const applyDrawColor = (tone: keyof typeof palette) => {
        const [r, g, b] = palette[tone];
        pdf.setDrawColor(r, g, b);
      };

      const applyFillColor = (tone: keyof typeof palette) => {
        const [r, g, b] = palette[tone];
        pdf.setFillColor(r, g, b);
      };

      const ensureSpace = (requiredHeight: number) => {
        if (y + requiredHeight <= pageHeight - pageMargin) {
          return;
        }

        pdf.addPage();
        y = pageMargin;
      };

      const drawLabel = (text: string, x: number, top: number) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        applyTextColor("muted");
        pdf.text(text.toUpperCase(), x, top);
        return top + 12;
      };

      const drawWrappedText = (
        text: string,
        x: number,
        top: number,
        width: number,
        options?: {
          color?: keyof typeof palette;
          font?: "helvetica" | "times";
          lineHeight?: number;
          size?: number;
          style?: "normal" | "bold";
        },
      ) => {
        pdf.setFont(options?.font ?? "helvetica", options?.style ?? "normal");
        pdf.setFontSize(options?.size ?? 11);
        applyTextColor(options?.color ?? "text");
        const lines = pdf.splitTextToSize(text, width);
        const lineHeight = options?.lineHeight ?? (options?.size ?? 11) * 1.5;

        for (const line of lines) {
          pdf.text(line, x, top);
          top += lineHeight;
        }

        return top;
      };

      const measureWrappedTextHeight = (
        text: string,
        width: number,
        options?: { lineHeight?: number; size?: number },
      ) => {
        const size = options?.size ?? 11;
        const lineHeight = options?.lineHeight ?? size * 1.5;
        return pdf.splitTextToSize(text, width).length * lineHeight;
      };

      const drawCard = (
        x: number,
        top: number,
        width: number,
        height: number,
        options?: { fill?: keyof typeof palette },
      ) => {
        applyDrawColor("border");
        if (options?.fill) {
          applyFillColor(options.fill);
          pdf.roundedRect(x, top, width, height, cardRadius, cardRadius, "FD");
          return;
        }
        pdf.roundedRect(x, top, width, height, cardRadius, cardRadius, "S");
      };

      const drawInfoCard = (
        x: number,
        top: number,
        width: number,
        label: string,
        value: string,
        options?: {
          bodyFont?: "helvetica" | "times";
          bodyLineHeight?: number;
          bodySize?: number;
          fill?: keyof typeof palette;
        },
      ) => {
        const inner = 16;
        const labelHeight = 12;
        const bodyHeight = measureWrappedTextHeight(value, width - inner * 2, {
          lineHeight: options?.bodyLineHeight,
          size: options?.bodySize,
        });
        const height = inner + labelHeight + 10 + bodyHeight + inner;
        drawCard(x, top, width, height, { fill: options?.fill });
        let cursor = top + inner + 8;
        cursor = drawLabel(label, x + inner, cursor);
        drawWrappedText(value, x + inner, cursor + 6, width - inner * 2, {
          color: "text",
          font: options?.bodyFont ?? "helvetica",
          lineHeight: options?.bodyLineHeight,
          size: options?.bodySize ?? 13,
        });
        return { height };
      };

      const drawDivider = (top: number) => {
        applyDrawColor("border");
        pdf.line(pageMargin, top, pageWidth - pageMargin, top);
      };

      const measurePartyCardHeight = (
        party: ReturnType<typeof buildPreviewDocument>["parties"][number],
        width: number,
        padding: number,
        signatureHeight: number,
      ) => {
        const bodyWidth = width - padding * 2;
        const companyHeight = pdf.splitTextToSize(party.company, bodyWidth).length * 16;
        const detailHeights = [party.signer, party.title, party.address].reduce(
          (total, value) =>
            total + 12 + 2 + measureWrappedTextHeight(value, bodyWidth, { size: 10, lineHeight: 14 }) + 4,
          0,
        );

        return padding + 8 + 18 + companyHeight + 4 + detailHeights + signatureHeight * 2 + padding;
      };

      ensureSpace(120);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      applyTextColor("accent");
      pdf.text("COMMON PAPER PROTOTYPE", pageMargin, y);
      y += 18;

      pdf.setFont("times", "bold");
      pdf.setFontSize(21);
      applyTextColor("text");
      pdf.text("Mutual Non-Disclosure Agreement", pageMargin, y);
      y += 20;

      y = drawWrappedText(
        'This Mutual Non-Disclosure Agreement (the "MNDA") consists of this Cover Page and the Common Paper Mutual NDA Standard Terms Version 1.0.',
        pageMargin,
        y,
        Math.min(contentWidth, 360),
        { color: "subtle", font: "helvetica", lineHeight: 16, size: 10 },
      );
      y += 12;
      drawDivider(y);
      y += 16;

      const leftColumnWidth = contentWidth * 0.46;
      const rightColumnWidth = contentWidth - leftColumnWidth - gap;
      const purposeCardHeight = drawInfoCard(pageMargin, y, leftColumnWidth, "Purpose", previewDocument.purpose, {
        bodyFont: "times",
        bodyLineHeight: 18,
        bodySize: 12,
        fill: "panel",
      }).height;
      const rightColumnX = pageMargin + leftColumnWidth + gap;
      const effectiveHeight = drawInfoCard(
        rightColumnX,
        y,
        rightColumnWidth,
        "Effective date",
        previewDocument.effectiveDate,
      ).height;
      const termCardWidth = (rightColumnWidth - gap) / 2;
      const termTop = y + effectiveHeight + gap;
      const termHeight = drawInfoCard(
        rightColumnX,
        termTop,
        termCardWidth,
        "MNDA term",
        `${previewDocument.ndaTermYears} year(s)`,
      ).height;
      const confidentialityHeight = drawInfoCard(
        rightColumnX + termCardWidth + gap,
        termTop,
        termCardWidth,
        "Confidentiality",
        `${previewDocument.confidentialityTermYears} year(s)`,
      ).height;
      y += Math.max(purposeCardHeight, effectiveHeight + gap + Math.max(termHeight, confidentialityHeight)) + 16;
      drawDivider(y);
      y += 16;

      const stackedSections = [
        ["Governing law", previewDocument.governingLaw],
        ["Jurisdiction", previewDocument.jurisdiction],
        ["MNDA modifications", previewDocument.modifications],
      ] as const;

      for (const [label, value] of stackedSections) {
        const blockHeight = 16 + measureWrappedTextHeight(value, contentWidth, { size: 12, lineHeight: 18 }) + 4;
        ensureSpace(blockHeight + 4);
        y = drawLabel(label, pageMargin, y + 4);
        y = drawWrappedText(value, pageMargin, y + 4, contentWidth, {
          font: "helvetica",
          lineHeight: 18,
          size: 12,
        });
        y += 6;
      }
      drawDivider(y);
      y += 12;

      ensureSpace(40);
      pdf.setFont("times", "bold");
      pdf.setFontSize(16);
      applyTextColor("text");
      pdf.text("Parties", pageMargin, y);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      applyTextColor("muted");
      pdf.text("SIGNATURE BLOCK", pageWidth - pageMargin, y, { align: "right" });
      y += 10;

      const partyCardWidth = (contentWidth - gap) / 2;
      const partyCardPadding = 14;
      const signatureSectionHeight = 28;
      const partyHeights = previewDocument.parties.map((party) =>
        measurePartyCardHeight(party, partyCardWidth, partyCardPadding, signatureSectionHeight),
      );
      ensureSpace(Math.max(...partyHeights) + 4);

      previewDocument.parties.forEach((party, index) => {
        const x = pageMargin + index * (partyCardWidth + gap);
        const height = partyHeights[index];
        drawCard(x, y, partyCardWidth, height, { fill: "panel" });

        let cursor = y + partyCardPadding + 8;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        applyTextColor("accent");
        pdf.text(`PARTY ${index + 1}`, x + partyCardPadding, cursor);
        cursor += 18;

        pdf.setFont("times", "bold");
        pdf.setFontSize(14);
        applyTextColor("text");
        const companyLines = pdf.splitTextToSize(party.company, partyCardWidth - partyCardPadding * 2);
        for (const line of companyLines) {
          pdf.text(line, x + partyCardPadding, cursor);
          cursor += 16;
        }
        cursor += 4;

        const partyDetails = [
          ["Print name", party.signer],
          ["Title", party.title],
          ["Notice address", party.address],
        ] as const;

        for (const [label, value] of partyDetails) {
          cursor = drawLabel(label, x + partyCardPadding, cursor);
          cursor = drawWrappedText(
            value,
            x + partyCardPadding,
            cursor + 2,
            partyCardWidth - partyCardPadding * 2,
            {
              lineHeight: 14,
              size: 10,
            },
          );
          cursor += 4;
        }

        const lineWidth = partyCardWidth - partyCardPadding * 2;
        for (const lineLabel of ["Signature", "Date"]) {
          applyDrawColor("border");
          pdf.line(x + partyCardPadding, cursor + 6, x + partyCardPadding + lineWidth, cursor + 6);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          applyTextColor("muted");
          pdf.text(lineLabel.toUpperCase(), x + partyCardPadding, cursor + 16);
          cursor += signatureSectionHeight;
        }
      });
      y += Math.max(...partyHeights) + 10;
      drawDivider(y);
      y += 26;

      for (const [index, section] of previewDocument.standardTerms.entries()) {
        const headingHeight = 20;
        const bodyHeight = section.body.reduce(
          (total, paragraph) =>
            total + measureWrappedTextHeight(paragraph, contentWidth, { size: 11, lineHeight: 18 }) + 10,
          0,
        );
        ensureSpace(headingHeight + bodyHeight + (index === 0 ? 30 : 0));

        if (index === 0) {
          pdf.setFont("times", "bold");
          pdf.setFontSize(18);
          applyTextColor("text");
          pdf.text("Standard Terms", pageMargin, y);
          y += 22;
        }

        pdf.setFont("times", "bold");
        pdf.setFontSize(14);
        applyTextColor("text");
        pdf.text(section.heading, pageMargin, y);
        y += 16;

        for (const paragraph of section.body) {
          y = drawWrappedText(paragraph, pageMargin, y, contentWidth, {
            color: "subtle",
            font: "helvetica",
            lineHeight: 18,
            size: 11,
          });
          y += 10;
        }
        y += 6;
      }

      ensureSpace(30);
      applyDrawColor("border");
      pdf.line(pageMargin, y, pageWidth - pageMargin, y);
      y += 16;
      drawWrappedText(
        "Source basis: Common Paper Mutual Non-Disclosure Agreement Version 1.0 cover page and standard terms, adapted into a fillable PDF export for prototype use.",
        pageMargin,
        y,
        contentWidth,
        { color: "muted", font: "helvetica", lineHeight: 14, size: 9.5 },
      );

      pdf.save(buildDownloadFileName(draft));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
      <section className="rounded-[2rem] border border-stone-200/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(120,53,15,0.12)] backdrop-blur">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
            MicroPrelegal
          </p>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-stone-950">
                Mutual NDA AI chat
              </h1>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Describe the deal in plain language. The assistant will gather the details and keep
                the draft current as you respond.
              </p>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                isComplete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {isComplete ? "Ready" : "In progress"}
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
              Drafting conversation
            </h2>
            <p className="text-xs text-stone-500">
              {isSending ? "Assistant is drafting..." : `${messages.length} messages`}
            </p>
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={`rounded-[1.5rem] px-4 py-3 text-sm leading-6 shadow-sm ${
                  message.role === "assistant"
                    ? "mr-6 border border-stone-200 bg-white text-stone-700"
                    : "ml-6 bg-[#032147] text-white"
                }`}
              >
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] opacity-70">
                  {message.role === "assistant" ? "Assistant" : "You"}
                </p>
                <p>{message.content}</p>
              </article>
            ))}
          </div>

          <form className="mt-4 space-y-3" onSubmit={sendMessage}>
            <label className="block">
              <span className="sr-only">Message</span>
              <textarea
                className="min-h-28 w-full rounded-[1.5rem] border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-600 focus:ring-4 focus:ring-amber-100"
                disabled={isSending}
                onChange={(event) => setComposerValue(event.target.value)}
                placeholder="Example: Party 1 is Northstar Labs, signed by Avery Stone, and Party 2 is Harbor Peak LLC."
                value={composerValue}
              />
            </label>

            {errorMessage ? (
              <p className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs leading-5 text-stone-500">
                {isPending
                  ? "Refreshing preview..."
                  : isSending
                    ? "Waiting for the next drafting question..."
                    : "The preview updates after each assistant turn."}
              </p>
              <button
                className="rounded-full bg-[#753991] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#62307a] disabled:cursor-not-allowed disabled:bg-[#9f7bb4]"
                disabled={isSending || !composerValue.trim()}
                type="submit"
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                Draft status
              </h2>
              <p className="mt-2 text-sm text-stone-600">
                {isComplete
                  ? "All required Mutual NDA fields are present."
                  : "The assistant still needs the items below to complete the draft."}
              </p>
            </div>
            <button
              className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
              disabled={isExporting}
              onClick={downloadDocument}
              type="button"
            >
              {isExporting ? "Preparing..." : "Download PDF"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {missingFields.length > 0 ? (
              missingFields.map((field) => (
                <span
                  key={field}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                >
                  {field}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Draft complete
              </span>
            )}
          </div>
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
          <NdaPreviewPaper previewDocument={previewDocument} />
        </div>
      </section>
    </section>
  );
}
