import type { ReactNode } from 'react';

export interface HeaderImageProps {
  alt?: string;
  align?: string;
  border?: string;
  width?: string;
  paddingLeft?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingTop?: string;
}

export interface HeaderProps {
  website?: string;
  logo?: string;
  headerBgColor?: string;
  headerImageProps?: HeaderImageProps;
}

export interface ButtonWithMessageProps {
  link?: string;
  linkText?: string;
  message?: string;
  subMessage?: ReactNode;
  bodyBgColor?: string;
  bodyTextColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
}

export interface FooterProps {
  companyName?: string;
  supportEmail?: string;
}

export interface GenerateOptions {
  title?: string;
  link?: string;
  linkText?: string;
  message?: string;
  subMessage?: ReactNode;
  bodyBgColor?: string;
  messageBgColor?: string;
  messageTextColor?: string;
  messageButtonBgColor?: string;
  messageButtonTextColor?: string;
  companyName?: string;
  supportEmail?: string;
  website?: string;
  logo?: string;
  headerBgColor?: string;
  headerImageProps?: HeaderImageProps;
}
