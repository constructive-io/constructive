# email

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Email records via app CLI

## Usage

```bash
app email list
app email get --id <value>
app email create --ownerId <value> --email <value> --isVerified <value> --isPrimary <value>
app email update --id <value> [--ownerId <value>] [--email <value>] [--isVerified <value>] [--isPrimary <value>]
app email delete --id <value>
```

## Examples

### List all email records

```bash
app email list
```

### Create a email

```bash
app email create --ownerId "value" --email "value" --isVerified "value" --isPrimary "value"
```

### Get a email by id

```bash
app email get --id <value>
```
