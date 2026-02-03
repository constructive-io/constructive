import {
  ArgumentNode,
  BooleanValueNode,
  ConstDirectiveNode,
  DefinitionNode,
  DirectiveNode,
  DocumentNode,
  FieldNode,
  FloatValueNode,
  FragmentDefinitionNode,
  IntValueNode,
  Kind,
  ListTypeNode,
  ListValueNode,
  NamedTypeNode,
  NullValueNode,
  ObjectFieldNode,
  ObjectValueNode,
  OperationDefinitionNode,
  OperationTypeNode,
  SelectionSetNode,
  StringValueNode,
  TypeNode,
  ValueNode,
  VariableDefinitionNode,
  VariableNode
} from 'graphql';

export const document = ({ definitions }: { definitions: DefinitionNode[] }): DocumentNode => ({
  kind: Kind.DOCUMENT,
  definitions
});

export const operationDefinition = ({
  operation,
  name,
  variableDefinitions = [],
  directives = [],
  selectionSet
}: {
  operation: OperationTypeNode;
  name: string;
  variableDefinitions?: VariableDefinitionNode[];
  directives?: DirectiveNode[];
  selectionSet: SelectionSetNode;
}): OperationDefinitionNode => ({
  kind: Kind.OPERATION_DEFINITION,
  operation,
  name: {
    kind: Kind.NAME,
    value: name
  },
  variableDefinitions,
  directives,
  selectionSet
});

export const variableDefinition = ({
  variable,
  type,
  directives
}: {
  variable: VariableNode;
  type: TypeNode;
  directives?: ConstDirectiveNode[];
}): VariableDefinitionNode => ({
  kind: Kind.VARIABLE_DEFINITION,
  variable,
  type,
  directives: directives || []
});

export const selectionSet = ({ selections }: { selections: readonly FieldNode[] }): SelectionSetNode => ({
  kind: Kind.SELECTION_SET,
  selections
});

export const listType = ({ type }: { type: TypeNode }): ListTypeNode => ({
  kind: Kind.LIST_TYPE,
  type
});

export const nonNullType = ({ type }: { type: NamedTypeNode | ListTypeNode }): TypeNode => ({
  kind: Kind.NON_NULL_TYPE,
  type
});

export const namedType = ({ type }: { type: string }): NamedTypeNode => ({
  kind: Kind.NAMED_TYPE,
  name: {
    kind: Kind.NAME,
    value: type
  }
});

export const variable = ({ name }: { name: string }): VariableNode => ({
  kind: Kind.VARIABLE,
  name: {
    kind: Kind.NAME,
    value: name
  }
});

export const objectValue = ({ fields }: { fields: ObjectFieldNode[] }): ObjectValueNode => ({
  kind: Kind.OBJECT,
  fields
});

export const stringValue = ({ value }: { value: string }): StringValueNode => ({
  kind: Kind.STRING,
  value
});

export const intValue = ({ value }: { value: string }): IntValueNode => ({
  kind: Kind.INT,
  value
});

export const booleanValue = ({ value }: { value: boolean }): BooleanValueNode => ({
  kind: Kind.BOOLEAN,
  value
});

export const floatValue = ({ value }: { value: string }): FloatValueNode => ({
  kind: Kind.FLOAT,
  value
});

export const listValue = ({ values }: { values: ValueNode[] }): ListValueNode => ({
  kind: Kind.LIST,
  values
});

export const nullValue = (): NullValueNode => ({
  kind: Kind.NULL
});

export const fragmentDefinition = ({
  name,
  typeCondition,
  directives = [],
  selectionSet
}: {
  name: string;
  typeCondition: NamedTypeNode;
  directives?: DirectiveNode[];
  selectionSet: SelectionSetNode;
}): FragmentDefinitionNode => ({
  kind: Kind.FRAGMENT_DEFINITION,
  name: {
    kind: Kind.NAME,
    value: name
  },
  typeCondition,
  directives,
  selectionSet
});

export const objectField = ({ name, value }: { name: string; value: ValueNode }): ObjectFieldNode => ({
  kind: Kind.OBJECT_FIELD,
  name: {
    kind: Kind.NAME,
    value: name
  },
  value
});

export const field = ({
  name,
  args = [],
  directives = [],
  selectionSet
}: {
  name: string;
  args?: ArgumentNode[];
  directives?: DirectiveNode[];
  selectionSet?: SelectionSetNode;
}): FieldNode => ({
  kind: Kind.FIELD,
  name: {
    kind: Kind.NAME,
    value: name
  },
  arguments: args,
  directives,
  selectionSet
});

export const argument = ({ name, value }: { name: string; value: ValueNode }): ArgumentNode => ({
  kind: Kind.ARGUMENT,
  name: {
    kind: Kind.NAME,
    value: name
  },
  value
});
