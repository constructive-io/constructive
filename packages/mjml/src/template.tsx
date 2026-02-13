import {
  Mjml,
  MjmlBody as Body,
  MjmlHead as Head,
  MjmlPreview as Preview,
  MjmlTitle as Title
} from 'mjml-react';

import { ButtonWithMessage } from './components/ButtonWithMessage';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import type { GenerateOptions } from './types';

export function buildEmailElement(options: GenerateOptions) {
  const {
    title,
    bodyBgColor,
    messageBgColor,
    messageTextColor,
    messageButtonBgColor,
    messageButtonTextColor,
    companyName,
    supportEmail,
    website,
    logo,
    headerBgColor,
    headerImageProps,
    link,
    linkText,
    message,
    subMessage
  } = options;

  return (
    <Mjml>
      <Head>
        <Title>{title}</Title>
        <Preview>{title}</Preview>
      </Head>
      <Body backgroundColor={bodyBgColor}>
        <Header
          headerBgColor={headerBgColor}
          website={website}
          logo={logo}
          headerImageProps={headerImageProps}
        />
        <ButtonWithMessage
          bodyBgColor={messageBgColor}
          bodyTextColor={messageTextColor}
          buttonBgColor={messageButtonBgColor}
          buttonTextColor={messageButtonTextColor}
          link={link}
          linkText={linkText}
          message={message}
          subMessage={subMessage}
        />
        <Footer companyName={companyName} supportEmail={supportEmail} />
      </Body>
    </Mjml>
  );
}
