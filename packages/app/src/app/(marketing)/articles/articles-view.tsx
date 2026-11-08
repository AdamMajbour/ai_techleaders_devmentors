"use client";

import { useState } from "react";
import { articleCreateSchema, type ArticleDto, type Page, type UserDto } from "@devmentor/core";
import {
  apiCall,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CrudForm,
  DataTable,
  useAsync,
  type DataTableColumn,
} from "@devmentor/ui";

const PAGE_SIZE = 5;

const CREATE_FIELDS = [
  { name: "title", label: "Title" },
  { name: "content", label: "Content", type: "textarea" },
] as const;

export function ArticlesView() {
  const [page, setPage] = useState(1);
  const [reloads, setReloads] = useState(0);
  const reload = () => setReloads((count) => count + 1);

  const me = useAsync(() => apiCall<UserDto>("/api/auth/me"), [reloads]);
  const list = useAsync(() => apiCall<Page<ArticleDto>>(`/api/articles?page=${page}&pageSize=${PAGE_SIZE}`), [page, reloads]);

  const user = me.data?.ok ? me.data.data : null;
  const result = list.data;
  const listError = result && !result.ok ? result.error.message : null;
  const articles = result?.ok ? result.data : undefined;

  const columns: DataTableColumn<ArticleDto>[] = [
    { key: "title", header: "Title", cell: (article) => article.title },
    { key: "content", header: "Content", cell: (article) => article.content, className: "min-w-48 whitespace-normal" },
    {
      key: "author",
      header: "Author",
      cell: (article) => (article.authorId === user?.id ? "You" : article.authorId.slice(0, 8)),
    },
  ];

  async function remove(article: ArticleDto) {
    await apiCall(`/api/articles/${article.id}`, { method: "DELETE" });
    reload();
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <h1 className="m-0 text-2xl font-semibold">Articles</h1>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            rows={articles?.items}
            getRowId={(article) => article.id}
            isLoading={list.status === "idle" || list.status === "pending"}
            error={listError}
            onRetry={reload}
            emptyTitle="No articles yet"
            emptyDescription={user ? "Write the first one below." : "Log in to write the first one."}
            pagination={articles ? { page: articles.page, pageCount: articles.pageCount, onPageChange: setPage } : undefined}
            rowActions={(article) =>
              article.authorId === user?.id ? (
                <Button variant="ghost" size="sm" onClick={() => remove(article)}>
                  Delete
                </Button>
              ) : null
            }
          />
        </CardContent>
      </Card>

      {user && (
        <Card>
          <CardHeader>
            <CardTitle>New article</CardTitle>
            <CardDescription>You are the author.</CardDescription>
          </CardHeader>
          <CardContent>
            <CrudForm
              key={reloads}
              schema={articleCreateSchema}
              fields={[...CREATE_FIELDS]}
              submitLabel="Publish"
              onSubmit={(values) => apiCall<ArticleDto>("/api/articles", { method: "POST", json: values })}
              onSuccess={() => {
                setPage(1);
                reload();
              }}
            />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
