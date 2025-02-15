import React, { useContext, useEffect, useState, useCallback } from "react";
import clsx from "clsx";
import Translate, { translate } from "@docusaurus/Translate";
import copy from "copy-text-to-clipboard";
import styles from "@site/src/pages/_components/ShowcaseCard/styles.module.css";
import Link from "@docusaurus/Link";
import { getCommPrompts, voteOnUserPrompt, createFavorite, updateFavorite } from "@site/src/api";
import LoginComponent from "@site/src/pages/_components/user/login";
import ShareButtons from "@site/src/pages/_components/ShareButtons";
import { AuthContext, AuthProvider } from "@site/src/pages/_components/AuthContext";
import Layout from "@theme/Layout";
import { Modal, Typography, Tooltip, message, Pagination, Dropdown, Space, Button, Input, ConfigProvider, theme } from "antd";
import themeConfig from "@site/src/pages/_components/themeConfig";
import { UpOutlined, DownOutlined, HomeOutlined, CopyOutlined, HeartOutlined, LoginOutlined } from "@ant-design/icons";

const { Search } = Input;
const { Text } = Typography;

const pageSize = 12;
const placeholderData = Array.from({ length: pageSize }, (_, index) => ({
  id: `key-${index}`,
  title: "Loading...",
  description: "Loading...",
  remark: null,
  notes: null,
  owner: "Loading...",
  upvotes: 0,
  downvotes: 0,
}));

const TITLE = "AiShort Community Prompts - Share and find interesting prompts";
const DESCRIPTION = translate({
  id: "description.communityPrompts",
  message:
    "探索由 AiShort 用户分享的创新提示词集合，这些独特且有趣的提示词可以激发你在创作短视频、小说、游戏等内容时的灵感。投票支持你最爱的提示，将它们复制并与你的朋友分享。让 AiShort 帮助你打开创造力的大门，一起创作出色的作品吧。",
});

const CommunityPrompts = () => {
  const { userAuth } = useContext(AuthContext);
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [userprompts, setUserPrompts] = useState(placeholderData);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState("id");
  const [sortOrder, setSortOrder] = useState("desc");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [Shareurl, setShareUrl] = useState("");
  const [votedUpPromptIds, setVotedUpPromptIds] = useState<number[]>([]);
  const [votedDownPromptIds, setVotedDownPromptIds] = useState<number[]>([]);

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  useEffect(() => {
    fetchData(currentPage, pageSize, sortField, sortOrder, searchTerm);
  }, [currentPage, sortField, sortOrder, searchTerm]);

  const fetchData = useCallback(async (currentPage, pageSize, sortField, sortOrder, searchTerm) => {
    try {
      const result = await getCommPrompts(currentPage, pageSize, sortField, sortOrder, searchTerm);
      if (result && result[0].length > 0) {
        setUserPrompts(result[0]);
        setTotal(result[1].data.meta.pagination.total);
      } else if (result && result[0].length === 0) {
        messageApi.open({
          type: "warning",
          content: "No data found.",
        });
        setUserPrompts([]);
        setTotal(0);
      } else {
        console.log("No data returned from the server");
      }
    } catch (error) {
      console.error("Failed to fetch community prompts:", error);
    }
  }, []);

  const onSearch = useCallback(
    (value) => {
      if (!userAuth) {
        setOpen(true);
        messageApi.open({
          type: "warning",
          content: "Please log in to search.",
        });
        return;
      }
      setSearchTerm(value);
      setCurrentPage(1);
    },
    [userAuth]
  );

  const vote = useCallback(async (promptId, action) => {
    try {
      await voteOnUserPrompt(promptId, action);
      messageApi.open({
        type: "success",
        content: `Successfully ${action}d!`,
      });
      const updateVotedIds = action === "upvote" ? setVotedUpPromptIds : setVotedDownPromptIds;
      updateVotedIds((prevIds) => [...prevIds, promptId]);
    } catch (err) {
      messageApi.open({
        type: "error",
        content: `Failed to ${action}. Error: ${err}`,
      });
    }
  }, []);

  const bookmark = useCallback(
    async (promptId) => {
      try {
        let userLoves;
        let favoriteId;

        if (!userAuth.data.favorites) {
          const createFavoriteResponse = await createFavorite([promptId], true);
          userLoves = [promptId];
          favoriteId = createFavoriteResponse.data.id;
        } else {
          userLoves = userAuth.data.favorites.commLoves || [];
          favoriteId = userAuth.data.favorites.id;

          if (!userLoves.includes(promptId)) {
            userLoves.push(promptId);
            messageApi.open({
              type: "success",
              content: "Added to favorites successfully!",
            });
          }
        }
        await updateFavorite(favoriteId, userLoves, true);
      } catch (err) {
        messageApi.open({
          type: "error",
          content: `Failed to add to favorites. Error: ${err}`,
        });
      }
    },
    [userAuth]
  );

  const handleCopyClick = useCallback(
    (index) => {
      const UserPrompt = userprompts[index];
      if (UserPrompt) {
        copy(UserPrompt.description);
        setCopiedIndex(index);
        setTimeout(() => {
          setCopiedIndex(null);
        }, 2000);
      }
    },
    [userprompts]
  );

  const onChangePage = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleFieldClick = useCallback((e) => {
    setCurrentPage(1);
    setSortField(e.key);
  }, []);

  const handleOrderClick = useCallback((e) => {
    setCurrentPage(1);
    setSortOrder(e.key);
  }, []);

  const fieldMenuProps = {
    items: [
      {
        label: translate({ id: "field.id", message: "发布时间" }),
        key: "id",
      },
      {
        label: translate({ id: "field.upvoteDifference", message: "投票支持" }),
        key: "upvoteDifference",
      },
    ],
    onClick: handleFieldClick,
  };

  const orderMenuProps = {
    items: [
      {
        label: translate({ id: "order.ascending", message: "升序" }),
        key: "asc",
      },
      {
        label: translate({ id: "order.descending", message: "降序" }),
        key: "desc",
      },
    ],
    onClick: handleOrderClick,
  };

  const truncate = (str, num) => (str.length <= num ? str : `${str.slice(0, num)}...`);

  const isDarkMode = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";

  return (
    <Layout title={TITLE} description={DESCRIPTION}>
      <main className="margin-vert--md">
        <ConfigProvider
          theme={{
            ...themeConfig,
            algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          }}>
          {contextHolder}
          <section className="margin-top--sm margin-bottom--sm">
            <div className="container padding-vert--md">
              <Space wrap style={{ marginBottom: "20px" }}>
                <Link to="/">
                  <HomeOutlined /> <Translate id="link.home">返回首页</Translate>
                </Link>
                {userAuth ? (
                  <Link to="/user/favorite">
                    <HeartOutlined /> <Translate id="link.myfavorite">我的收藏</Translate>
                  </Link>
                ) : (
                  <Button onClick={() => setOpen(true)}>
                    <LoginOutlined /> <Translate id="button.login">登录</Translate>
                  </Button>
                )}
                <Dropdown.Button icon={<DownOutlined />} menu={fieldMenuProps}>
                  {sortField === "id" ? <Translate id="field.id">发布时间</Translate> : <Translate id="field.upvoteDifference">支持度</Translate>}
                </Dropdown.Button>
                <Dropdown.Button icon={<DownOutlined />} menu={orderMenuProps}>
                  {sortOrder === "asc" ? <Translate id="order.ascending">升序</Translate> : <Translate id="order.descending">降序</Translate>}
                </Dropdown.Button>
                <Search placeholder="Search" onSearch={onSearch} style={{ width: 200 }} allowClear />
              </Space>
              <ul className="clean-list showcaseList_Cwj2">
                {userprompts.map((UserPrompt, index) => (
                  <li key={UserPrompt.id} className="card shadow--md">
                    <div className={clsx("card__body")} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
                      <div>
                        <div className={clsx(styles.showcaseCardHeader)}>
                          <div className={`${styles.showcaseCardTitle} ${styles.shortEllipsis}`}>
                            <span className={styles.showcaseCardLink} style={{ color: "var(--ifm-color-primary)" }}>
                              {UserPrompt.title}
                            </span>
                            <span style={{ fontSize: "12px", color: "#999", marginLeft: "10px" }}>@{UserPrompt.owner}</span>
                          </div>
                        </div>
                        {UserPrompt.remark && <p className={styles.showcaseCardBody}>👉 {UserPrompt.remark}</p>}
                        <p className={styles.showcaseCardBody}>
                          {UserPrompt.notes ? (
                            <Tooltip placement="right" title={truncate(UserPrompt.notes, 300)} style={{ maxWidth: 450 }}>
                              {UserPrompt.description}
                            </Tooltip>
                          ) : (
                            UserPrompt.description
                          )}
                        </p>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Space.Compact>
                          <Tooltip title={translate({ id: "theme.CodeBlock.copy", message: "复制" })}>
                            <Button type="default" onClick={() => handleCopyClick(index)}>
                              <CopyOutlined />
                              {copiedIndex === index && <Translate id="theme.CodeBlock.copied">已复制</Translate>}
                            </Button>
                          </Tooltip>
                          <Tooltip title={translate({ message: "收藏" })}>
                            <Button
                              type="default"
                              onClick={() => {
                                if (!userAuth) {
                                  messageApi.open({
                                    type: "warning",
                                    content: "Please log in to bookmark.",
                                  });
                                  return;
                                }
                                vote(UserPrompt.id, "upvote");
                                bookmark(UserPrompt.id);
                              }}>
                              <HeartOutlined />
                            </Button>
                          </Tooltip>
                        </Space.Compact>
                        <Space.Compact>
                          <Tooltip title={translate({ id: "upvote", message: "赞" })}>
                            <Button
                              type="default"
                              onClick={() => {
                                if (!userAuth) {
                                  messageApi.open({
                                    type: "warning",
                                    content: "Please log in to vote.",
                                  });
                                  return;
                                }
                                vote(UserPrompt.id, "upvote");
                              }}>
                              <UpOutlined />
                              {votedUpPromptIds.includes(UserPrompt.id) ? (UserPrompt.upvotes || 0) + 1 : UserPrompt.upvotes || 0}
                            </Button>
                          </Tooltip>
                          <Tooltip title={translate({ id: "downvote", message: "踩" })}>
                            <Button
                              type="default"
                              onClick={() => {
                                if (!userAuth) {
                                  messageApi.open({
                                    type: "warning",
                                    content: "Please log in to vote.",
                                  });
                                  return;
                                }
                                vote(UserPrompt.id, "downvote");
                              }}>
                              <DownOutlined />
                              {votedDownPromptIds.includes(UserPrompt.id) ? (UserPrompt.downvotes || 0) + 1 : UserPrompt.downvotes || 0}
                            </Button>
                          </Tooltip>
                        </Space.Compact>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Pagination current={currentPage} pageSize={pageSize} total={total} showQuickJumper showSizeChanger={false} onChange={onChangePage} />
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
                <Text type="secondary" style={{ color: "var(--ifm-color-secondary)", fontSize: "10px" }}>
                  {translate({
                    id: "info.communityPrompts",
                    message:
                      "本页面展示的提示词均由网友分享和上传，我们无法保证内容的准确性、质量或完整性，同时也不对因内容引发的任何法律责任承担责任。如果发现有侵权或者其他问题，可以联系我们进行处理。我们将在收到通知后尽快处理。",
                  })}
                </Text>
              </div>
              <Modal open={open} footer={null} onCancel={() => setOpen(false)}>
                <LoginComponent />
              </Modal>
              <ShareButtons shareUrl={Shareurl} title={TITLE} popOver={false} />
            </div>
          </section>
        </ConfigProvider>
      </main>
    </Layout>
  );
};

export default function WrappedCommunityPrompts() {
  return (
    <AuthProvider>
      <CommunityPrompts />
    </AuthProvider>
  );
}
