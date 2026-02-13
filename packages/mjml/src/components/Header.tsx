import {
  MjmlColumn as Column,
  MjmlImage as Image,
  MjmlSection as Section
} from 'mjml-react';

import type { HeaderImageProps, HeaderProps } from '../types';

const defaultHeaderImageProps: HeaderImageProps = {
  alt: 'logo',
  align: 'center',
  border: 'none',
  width: '182px',
  paddingLeft: '0px',
  paddingRight: '0px',
  paddingBottom: '0px',
  paddingTop: '0'
};

export function Header({
  website = 'https://mjml.io',
  logo = 'https://mjml.io/assets/img/logo-white-small.png',
  headerBgColor = 'white',
  headerImageProps = defaultHeaderImageProps
}: HeaderProps = {}) {
  return (
    <>
      <Section locked="true" paddingBottom="20px" paddingTop="20">
        <Column width="66.66666666666666%" verticalAlign="middle" />
        <Column width="33.33333333333333%" verticalAlign="middle" />
      </Section>
      <Section
        backgroundColor={headerBgColor}
        paddingBottom={20}
        paddingTop={20}
      >
        <Column width="100%" verticalAlign="top">
          <Image href={website} src={logo} {...headerImageProps} />
        </Column>
      </Section>
    </>
  );
}
