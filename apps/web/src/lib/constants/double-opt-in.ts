export const DEFAULT_DOUBLE_OPT_IN_SUBJECT = "Please confirm your subscription";

const DEFAULT_DOUBLE_OPT_IN_CONTENT_JSON = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2, textAlign: "center" },
      content: [
        {
          type: "text",
          text: "Confirm your subscription",
        },
      ],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [
        {
          type: "text",
          text: "Thanks for signing up! Tap the button below to confirm your email address and start receiving our emails.",
        },
      ],
    },
    {
      type: "button",
      attrs: {
        component: "button",
        text: "Confirm subscription",
        url: "{{doubleOptInUrl}}",
        alignment: "center",
        borderRadius: "10",
        borderWidth: "0",
        buttonColor: "#e8825e",
        borderColor: "#e8825e",
        textColor: "#ffffff",
      },
    },
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [
        {
          type: "text",
          marks: [{ type: "textStyle", attrs: { color: "#9ca3af" } }],
          text: "If the button doesn't work, copy and paste this link into your browser: ",
        },
        {
          type: "variable",
          attrs: { id: "doubleOptInUrl", name: "doubleOptInUrl", fallback: "" },
        },
      ],
    },
    {
      type: "horizontalRule",
    },
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [
        {
          type: "text",
          marks: [{ type: "textStyle", attrs: { color: "#9ca3af" } }],
          text: "You're receiving this email because you signed up on our site. Didn't request this? You can safely ignore it.",
        },
      ],
    },
  ],
};

export const DEFAULT_DOUBLE_OPT_IN_CONTENT = JSON.stringify(
  DEFAULT_DOUBLE_OPT_IN_CONTENT_JSON,
);

export const DOUBLE_OPT_IN_EDITOR_VARIABLES = [
  "email",
  "firstName",
  "lastName",
  "doubleOptInUrl",
];

const DOUBLE_OPT_IN_URL_PLACEHOLDER_REGEX =
  /\{\{\s*doubleOptInUrl(?:\s*,\s*fallback=[^}]+)?\s*\}\}/i;

function valueIncludesDoubleOptInUrl(value: unknown): boolean {
  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    return (
      DOUBLE_OPT_IN_URL_PLACEHOLDER_REGEX.test(value) ||
      normalizedValue === "doubleoptinurl"
    );
  }

  if (Array.isArray(value)) {
    return value.some(valueIncludesDoubleOptInUrl);
  }

  if (value && typeof value === "object") {
    return Object.values(value).some(valueIncludesDoubleOptInUrl);
  }

  return false;
}

export function hasDoubleOptInUrlPlaceholder(content: string): boolean {
  if (DOUBLE_OPT_IN_URL_PLACEHOLDER_REGEX.test(content)) {
    return true;
  }

  try {
    return valueIncludesDoubleOptInUrl(JSON.parse(content));
  } catch {
    return false;
  }
}

export function getDefaultDoubleOptInContent() {
  return structuredClone(DEFAULT_DOUBLE_OPT_IN_CONTENT_JSON) as Record<
    string,
    any
  >;
}
