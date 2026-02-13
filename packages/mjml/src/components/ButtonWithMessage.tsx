import {
  MjmlButton as Button,
  MjmlColumn as Column,
  MjmlSection as Section,
  MjmlText as Text
} from 'mjml-react';

import type { ButtonWithMessageProps } from '../types';

const fontFamily =
  'Ubuntu, Helvetica, Arial, sans-serif, Helvetica, Arial, sans-serif';

export function ButtonWithMessage({
  link,
  message,
  subMessage,
  linkText,
  bodyBgColor = 'white',
  bodyTextColor = '#414141',
  buttonBgColor = '#414141',
  buttonTextColor = 'white'
}: ButtonWithMessageProps = {}) {
  return (
    <>
      <Section backgroundColor={bodyBgColor} paddingBottom="0px" paddingTop="0">
        <Column width="100%" verticalAlign="top">
          <Text
            align="center"
            color={bodyTextColor}
            fontFamily={fontFamily}
            fontSize="13px"
            paddingLeft="25px"
            paddingRight="25px"
            paddingBottom="0px"
            paddingTop="0"
          >
            <p>
              <span style={{ fontSize: '27px' }}>
                <span style={{ fontWeight: 'bold' }}>
                  <span style={{ color: bodyTextColor }}>{message}</span>
                </span>
              </span>
            </p>
            {subMessage != null ? subMessage : null}
          </Text>
          <Button
            backgroundColor={buttonBgColor}
            color={buttonTextColor}
            fontSize="15px"
            align="center"
            verticalAlign="middle"
            border="none"
            padding="15px 30px"
            borderRadius="3px"
            href={link}
            fontFamily={fontFamily}
            paddingLeft="25px"
            paddingRight="25px"
            paddingBottom="25px"
            paddingTop="25px"
          >
            {linkText}
          </Button>
          <Text
            align="center"
            color={bodyTextColor}
            fontFamily={fontFamily}
            fontSize="11px"
            paddingLeft="25px"
            paddingRight="25px"
            paddingBottom="0px"
            paddingTop="0px"
          >
            <p>or copy and paste this link into your browser:</p>
            <p>{link}</p>
          </Text>
        </Column>
      </Section>
    </>
  );
}
