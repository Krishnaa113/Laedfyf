import { buildSchema, graphql, GraphQLError } from "graphql";
import { resolvers } from "@/lib/graphql/resolvers";
import { typeDefs } from "@/lib/graphql/schema";

export const graphqlSchema = buildSchema(typeDefs);

export async function executeGraphql(input: {
  query?: string | null;
  variables?: Record<string, unknown> | null;
  operationName?: string | null;
}) {
  if (!input.query?.trim()) {
    return {
      errors: [new GraphQLError("Query is required")],
    };
  }

  return graphql({
    schema: graphqlSchema,
    source: input.query,
    rootValue: resolvers.Query,
    variableValues: input.variables ?? undefined,
    operationName: input.operationName ?? undefined,
  });
}
