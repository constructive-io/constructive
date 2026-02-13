import {
  MjmlColumn as Column,
  MjmlSection as Section,
  MjmlText as Text
} from 'mjml-react';

import type { FooterProps } from '../types';

export function Footer({
  companyName = 'Acme, Inc.',
  supportEmail = 'support@example.com'
}: FooterProps = {}) {
  return (
    <>
      <Section backgroundColor="#ffffff" paddingBottom="20px" paddingTop="20">
        <Column width="100%" verticalAlign="top">
          <Text
            align="center"
            color="#000"
            fontFamily="Ubuntu, Helvetica, Arial, sans-serif, Helvetica, Arial, sans-serif"
            fontSize="13px"
            paddingLeft="25px"
            paddingRight="25px"
            paddingBottom="10px"
            paddingTop="10"
          >
            <p>Any questions, comments, concerns?</p>
            <p>
              Contact our support staff at{' '}
              <a
                href={`mailto:${supportEmail}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <span style={{ fontWeight: 'bold' }}>{supportEmail}</span>
              </a>
            </p>
          </Text>
        </Column>
      </Section>
      <Section locked="true" paddingBottom="20px" paddingTop="20">
        <Column width="100%" verticalAlign="middle">
          <Text
            align="center"
            color="#000000"
            fontFamily="Ubuntu, Helvetica, Arial, sans-serif, Helvetica, Arial, sans-serif"
            fontSize="11px"
            locked="true"
            editable="false"
            paddingLeft="25px"
            paddingRight="25px"
            paddingBottom="0px"
            paddingTop="0"
          >
            <p style={{ fontSize: '11px' }}>{companyName}</p>
          </Text>
        </Column>
      </Section>
    </>
  );
}
