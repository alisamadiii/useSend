"use client";

import { Button } from "@usesend/ui/src/button";
import Image from "next/image";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { ClientSafeProvider, LiteralUnion, signIn } from "next-auth/react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@usesend/ui/src/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  REGEXP_ONLY_DIGITS_AND_CHARS,
} from "@usesend/ui/src/input-otp";
import { Input } from "@usesend/ui/src/input";
import { BuiltInProviderType } from "next-auth/providers/index";
import Spinner from "@usesend/ui/src/spinner";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams as useNextSearchParams } from "next/navigation";
import { GENERIC_AUTH_ERROR_MESSAGE, getAuthErrorMessage } from "./auth-error";

const emailSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email({ message: "Invalid email" }),
});

const otpSchema = z.object({
  otp: z
    .string({ required_error: "OTP is required" })
    .length(5, { message: "Invalid OTP" }),
});

const providerSvgs = {
  github: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 496 512"
      className="fill-foreground h-4 w-4"
    >
      <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3 .3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5 .3-6.2 2.3zm44.2-1.7c-2.9 .7-4.9 2.6-4.6 4.9 .3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3 .7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3 .3 2.9 2.3 3.9 1.6 1 3.6 .7 4.3-.7 .7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3 .7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3 .7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z" />
    </svg>
  ),
  google: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 488 512"
      className="fill-foreground h-4 w-4"
    >
      <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
    </svg>
  ),
};

export default function LoginPage({
  providers,
  isSignup = false,
}: {
  providers?: ClientSafeProvider[];
  isSignup?: boolean;
}) {
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "sending" | "success"
  >("idle");

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  async function onEmailSubmit(values: z.infer<typeof emailSchema>) {
    setEmailStatus("sending");
    emailForm.clearErrors("email");

    try {
      const result = await signIn("email", {
        email: values.email.toLowerCase(),
        redirect: false,
      });

      if (!result || result.error) {
        setEmailStatus("idle");
        emailForm.setError(
          "email",
          {
            type: "server",
            message:
              getAuthErrorMessage(result?.error) ?? GENERIC_AUTH_ERROR_MESSAGE,
          },
          { shouldFocus: true },
        );
        return;
      }

      setEmailStatus("success");
    } catch {
      setEmailStatus("idle");
      emailForm.setError(
        "email",
        {
          type: "server",
          message: GENERIC_AUTH_ERROR_MESSAGE,
        },
        { shouldFocus: true },
      );
    }
  }

  async function onOTPSubmit(values: z.infer<typeof otpSchema>) {
    const { origin: callbackUrl } = window.location;
    const email = emailForm.getValues().email;
    console.log("email", email);

    const finalCallbackUrl = inviteId
      ? `/join-team?inviteId=${inviteId}`
      : `${callbackUrl}/dashboard`;
    window.location.href = `/api/auth/callback/email?email=${encodeURIComponent(
      email.toLowerCase(),
    )}&token=${values.otp.toLowerCase()}&callbackUrl=${encodeURIComponent(finalCallbackUrl)}`;
  }

  const emailProvider = providers?.find(
    (provider) => provider.type === "email",
  );

  const [submittedProvider, setSubmittedProvider] =
    useState<LiteralUnion<BuiltInProviderType> | null>(null);

  const searchParams = useNextSearchParams();
  const inviteId = searchParams.get("inviteId");
  const authErrorMessage = getAuthErrorMessage(searchParams.get("error"));

  const handleSubmit = (provider: LiteralUnion<BuiltInProviderType>) => {
    setSubmittedProvider(provider);
    const callbackUrl = inviteId
      ? `/join-team?inviteId=${inviteId}`
      : "/dashboard";
    signIn(provider, { callbackUrl });
  };

  return (
    <main className="bg-muted/50 dark:bg-background flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col">
        {emailStatus === "success" ? (
          <div className="flex flex-col items-center gap-5 py-2 text-center">
            <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full">
              <MailCheck className="size-6" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-semibold tracking-tight">
                Check your email
              </h2>
              <p className="text-muted-foreground text-sm text-balance">
                We sent a one-time code to{" "}
                <span className="text-foreground font-medium">
                  {emailForm.getValues().email}
                </span>
                . Enter it below to log in.
              </p>
            </div>
            <Form {...otpForm}>
              <form
                onSubmit={otpForm.handleSubmit(onOTPSubmit)}
                className="flex w-full flex-col gap-4"
              >
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <InputOTP
                          maxLength={5}
                          pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                          inputMode="text"
                          {...field}
                        >
                          <InputOTPGroup className="w-full">
                            <InputOTPSlot className="bg-card h-12 flex-1" index={0} />
                            <InputOTPSlot className="bg-card h-12 flex-1" index={1} />
                            <InputOTPSlot className="bg-card h-12 flex-1" index={2} />
                            <InputOTPSlot className="bg-card h-12 flex-1" index={3} />
                            <InputOTPSlot className="bg-card h-12 flex-1" index={4} />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button size="lg" className="mt-1 h-12 w-full rounded-full">
                  Submit
                </Button>
              </form>
            </Form>
            <button
              type="button"
              onClick={() => setEmailStatus("idle")}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              <Image
                src={"/logo-squircle.png"}
                alt="alisamadii"
                width={44}
                height={44}
                className="size-11 rounded-xl object-cover"
              />
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold">
                  {isSignup ? "Create new account" : "Login to alisamadii Mail"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {isSignup
                    ? "Already have an account?"
                    : "New to alisamadii Mail?"}
                  <Link
                    href={isSignup ? "/login" : "/signup"}
                    className="text-foreground ml-1 font-medium transition-opacity hover:opacity-70"
                  >
                    {isSignup ? "Sign in" : "Create new account"}
                  </Link>
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4">
              {authErrorMessage ? (
                <p role="alert" className="text-destructive text-sm">
                  {authErrorMessage}
                </p>
              ) : null}
              {emailProvider && (
                <Form {...emailForm}>
                  <form
                    onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                    className="flex flex-col gap-3"
                  >
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Email"
                              className="bg-background h-12 rounded-full px-5 text-base"
                              type="email"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      className="mt-1 h-12 w-full rounded-full"
                      size="lg"
                      disabled={emailStatus === "sending"}
                    >
                      {emailStatus === "sending" ? (
                        <Spinner className="h-5 w-5" />
                      ) : isSignup ? (
                        "Sign up with email"
                      ) : (
                        "Continue with email"
                      )}
                    </Button>
                  </form>
                </Form>
              )}

              {emailProvider &&
              providers?.some((provider) => provider.type !== "email") ? (
                <div className="flex items-center">
                  <div className="flex-1 border-t" />
                  <span className="text-muted-foreground px-3 text-xs">
                    Or continue with
                  </span>
                  <div className="flex-1 border-t" />
                </div>
              ) : null}

              {providers &&
                Object.values(providers).map((provider) => {
                  if (provider.type === "email") return null;
                  return (
                    <Button
                      key={provider.id}
                      variant="outline"
                      size="lg"
                      className="h-12 w-full rounded-full"
                      onClick={() => handleSubmit(provider.id)}
                    >
                      {submittedProvider === provider.id ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        providerSvgs[provider.id as keyof typeof providerSvgs]
                      )}
                      <span className="ml-2">{provider.name}</span>
                    </Button>
                  );
                })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
