"""笔记提示词 skill 的单元测试。"""

import pytest
from pydantic import ValidationError

from src.application.document_service import _extract_tag, _extract_title
from src.application.note_prompts import (
    NOTE_SKILL_PROMPTS,
    VALID_NOTE_TYPES,
    NoteType,
    get_note_skill_prompt,
)
from src.domain.schemas.document import GenerateNoteRequest


@pytest.mark.parametrize("note_type", VALID_NOTE_TYPES)
def test_each_note_type_has_a_prompt(note_type: NoteType) -> None:
    """每一种笔记类型都应有可用提示词。"""
    prompt = get_note_skill_prompt(note_type)

    assert prompt
    assert "Markdown" in prompt
    assert "标签: [标签名]" in prompt


def test_note_prompt_skills_cover_expected_content_types() -> None:
    """专用提示词应覆盖当前产品需要的内容类型。"""
    assert "微信公众号" in NOTE_SKILL_PROMPTS["wechat_article"]
    assert "口播" in NOTE_SKILL_PROMPTS["video_script"]
    assert "小红书" in NOTE_SKILL_PROMPTS["xiaohongshu"]


def test_wechat_article_prompt_requires_publishable_article() -> None:
    """公众号类型必须生成文章正文，而不是推文拆解笔记。"""
    prompt = get_note_skill_prompt("wechat_article")

    assert "直接写出一篇可发布的微信公众号文章" in prompt
    assert "完整文章正文" in prompt
    assert "### 推文结构拆解\n" not in prompt
    assert "不要改写成完整推文" not in prompt


def test_xiaohongshu_prompt_requires_publishable_post() -> None:
    """小红书类型必须生成可发布文案，而不是结构拆解笔记。"""
    prompt = get_note_skill_prompt("xiaohongshu")

    assert "直接写出一篇可发布的小红书文案" in prompt
    assert "完整文案" in prompt
    assert "3 到 8 个可直接发布的话题标签" in prompt
    assert "### 小红书结构拆解\n" not in prompt


def test_generate_note_request_defaults_to_general() -> None:
    """旧前端只传 messages 时仍默认使用通用笔记。"""
    req = GenerateNoteRequest(messages=[{"role": "user", "content": "整理一下"}])

    assert req.note_type == "general"


def test_generate_note_request_rejects_unknown_note_type() -> None:
    """非法笔记类型应由请求体验证拒绝。"""
    with pytest.raises(ValidationError):
        GenerateNoteRequest(
            messages=[],
            note_type="podcast",
        )


def test_extract_title_and_tag_keep_existing_output_contract() -> None:
    """标题和标签解析应保持现有输出约定。"""
    content = "## 视频选题复盘\n\n正文\n\n---\n标签: 工作"

    assert _extract_title(content) == "视频选题复盘"
    assert _extract_tag(content) == "工作"
