# csv-to-pg

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/csv-to-pg"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=packages%2Fcsv-to-pg%2Fpackage.json"/></a>
</p>

Create PostgreSQL statements from CSV files

## Installation

```sh
npm install -g csv-to-pg
```

## Usage

The idea for this library was to solve complex CSV scenarios, so currently each CSV requires a config file. 

### config

Here is an example of a config.yaml that we can use to parse a csv that has no headers, and uses tab-delimited elements:

```yaml
input: "./myfile.tsv"
output: "./myfile.sql"
schema: myschema
table: mytable
delimeter: "\t"
headers:   # order of the headers
  - feature
  - category
  - days
  - start
  - end
fields:
  feature: text
  category: text
  days: int
  start: date
  end:
    type: date
    cast: date  # explicitly cast to a date type
```

You can also use JS files or JSON. If you use JS, you can also create ASTs for super custom inserts (read tests).

### run it!

Once you have a config file, simply call it and point to the config:

```sh
csv2pg ./config.yaml
```
