package com.accountsnap

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalSize
import androidx.glance.unit.ColorProvider
import androidx.glance.layout.ContentScale
import androidx.glance.action.clickable
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import org.json.JSONArray

private const val WIDGET_KEY_ACCOUNTS = "widget:accounts"
private const val WIDGET_KEY_LAST_USED_ID = "widget:lastUsedId"

private val widgetAccent = ColorProvider(Color(0xFF1E2D6E))
private val widgetAccentText = ColorProvider(Color.White)
private val widgetAccentSubText = ColorProvider(Color(0xCCFFFFFF))

data class WidgetAccount(
    val id: String,
    val bankName: String,
    val bankCode: String?,
    val accountNumber: String,
    val label: String?,
    val isFavorite: Boolean,
)

private data class BankPattern(val code: String, val groups: List<List<Int>>)

private val BANK_PATTERNS = listOf(
    BankPattern("004", listOf(listOf(3, 2, 4, 3), listOf(3, 4, 7))),
    BankPattern("088", listOf(listOf(3, 3, 6), listOf(3, 2, 6))),
    BankPattern("020", listOf(listOf(4, 3, 6))),
    BankPattern("081", listOf(listOf(3, 6, 5))),
    BankPattern("011", listOf(listOf(3, 4, 4, 2))),
    BankPattern("003", listOf(listOf(3, 6, 2, 3))),
    BankPattern("090", listOf(listOf(4, 2, 7))),
    BankPattern("092", listOf(listOf(4, 4, 4))),
    BankPattern("089", listOf(listOf(3, 3, 6))),
    BankPattern("023", listOf(listOf(3, 2, 6))),
    BankPattern("027", listOf(listOf(3, 3, 6))),
    BankPattern("071", listOf(listOf(6, 2, 6))),
    BankPattern("045", listOf(listOf(4, 4, 5))),
    BankPattern("048", listOf(listOf(4, 4, 5))),
)

private fun defaultGroupFormat(raw: String, groupSize: Int = 4): String {
    val sb = StringBuilder()
    raw.forEachIndexed { i, c ->
        if (i > 0 && i % groupSize == 0) sb.append('-')
        sb.append(c)
    }
    return sb.toString()
}

private fun formatAccountByBank(raw: String, bankCode: String?): String {
    val digits = raw.filter { it.isDigit() }
    val bank = bankCode?.takeIf { it.isNotEmpty() }
        ?.let { code -> BANK_PATTERNS.firstOrNull { it.code == code } }
    val groups = bank?.groups?.firstOrNull { it.sum() == digits.length }
        ?: return defaultGroupFormat(digits)
    val out = StringBuilder()
    var idx = 0
    for ((i, len) in groups.withIndex()) {
        if (i > 0) out.append('-')
        val end = (idx + len).coerceAtMost(digits.length)
        out.append(digits.substring(idx, end))
        idx = end
    }
    return out.toString()
}

private fun loadAccounts(context: Context): Pair<WidgetAccount?, List<WidgetAccount>> {
    val prefs = context.getSharedPreferences(AppGroupModule.SUITE, Context.MODE_PRIVATE)
    val json = prefs.getString(WIDGET_KEY_ACCOUNTS, "[]") ?: "[]"
    val all = mutableListOf<WidgetAccount>()
    try {
        val arr = JSONArray(json)
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            all.add(
                WidgetAccount(
                    id = o.getString("id"),
                    bankName = o.optString("bankName", ""),
                    bankCode = o.optString("bankCode").takeIf { it.isNotEmpty() },
                    accountNumber = o.optString("accountNumber", ""),
                    label = o.optString("label").takeIf { it.isNotEmpty() },
                    isFavorite = o.optBoolean("isFavorite", false),
                )
            )
        }
    } catch (_: Exception) {
    }
    val lastId = prefs.getString(WIDGET_KEY_LAST_USED_ID, null)
    val lastUsed = lastId?.let { id -> all.firstOrNull { it.id == id } } ?: all.firstOrNull()
    val favorites = all.filter { it.isFavorite }
    return lastUsed to favorites
}

private fun cameraIntent(): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse("accountsnap://camera"))

private fun copyIntent(id: String): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse("accountsnap://copy/$id"))

class AccountWidget : GlanceAppWidget() {
    override val sizeMode: SizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val (lastUsed, favorites) = loadAccounts(context)
        provideContent {
            GlanceTheme {
                WidgetContent(lastUsed, favorites)
            }
        }
    }
}

@Composable
private fun WidgetContent(lastUsed: WidgetAccount?, favorites: List<WidgetAccount>) {
    val size = LocalSize.current
    val isSmall = size.width < 180.dp || size.height < 120.dp
    val isLarge = size.height > 240.dp

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.widgetBackground)
            .padding(12.dp)
    ) {
        when {
            isSmall -> ShutterTile()
            isLarge -> LargeContent(favorites)
            else -> MediumContent(lastUsed)
        }
    }
}

@Composable
private fun LargeContent(favorites: List<WidgetAccount>) {
    Column(modifier = GlanceModifier.fillMaxSize()) {
        ShutterBar()
        Spacer(modifier = GlanceModifier.height(10.dp))
        Text(
            "⭐ 즐겨찾기",
            style = TextStyle(
                fontSize = 11.sp,
                color = GlanceTheme.colors.onSurfaceVariant,
            ),
        )
        Spacer(modifier = GlanceModifier.height(6.dp))
        if (favorites.isEmpty()) {
            Text(
                "즐겨찾기한 계좌가 없어요",
                style = TextStyle(
                    fontSize = 12.sp,
                    color = GlanceTheme.colors.onSurfaceVariant,
                ),
            )
        } else {
            LazyColumn {
                items(favorites.take(5), itemId = { it.id.hashCode().toLong() }) { a ->
                    FavoriteRow(a)
                }
            }
        }
    }
}

@Composable
private fun MediumContent(lastUsed: WidgetAccount?) {
    Row(modifier = GlanceModifier.fillMaxSize()) {
        Box(modifier = GlanceModifier.width(80.dp).fillMaxSize()) {
            ShutterTile()
        }
        Spacer(modifier = GlanceModifier.width(10.dp))
        Box(modifier = GlanceModifier.fillMaxSize(), contentAlignment = Alignment.CenterStart) {
            if (lastUsed != null) {
                Column(
                    modifier = GlanceModifier.clickable(
                        actionStartActivity(copyIntent(lastUsed.id))
                    )
                ) {
                    Text(
                        "최근 추출",
                        style = TextStyle(
                            fontSize = 10.sp,
                            color = GlanceTheme.colors.onSurfaceVariant,
                        ),
                    )
                    Spacer(modifier = GlanceModifier.height(2.dp))
                    Text(
                        lastUsed.label ?: lastUsed.bankName,
                        style = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Bold),
                        maxLines = 1,
                    )
                    Spacer(modifier = GlanceModifier.height(4.dp))
                    Text(
                        formatAccountByBank(lastUsed.accountNumber, lastUsed.bankCode),
                        style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium),
                        maxLines = 2,
                    )
                }
            } else {
                Text(
                    "아직 없어요",
                    style = TextStyle(
                        fontSize = 12.sp,
                        color = GlanceTheme.colors.onSurfaceVariant,
                    ),
                )
            }
        }
    }
}

@Composable
private fun ShutterTile() {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(widgetAccent)
            .cornerRadius(12.dp)
            .clickable(actionStartActivity(cameraIntent())),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Image(
                provider = ImageProvider(R.drawable.ic_app_logo),
                contentDescription = "스냅넘버",
                contentScale = ContentScale.Fit,
                modifier = GlanceModifier.width(40.dp).height(40.dp).cornerRadius(10.dp),
            )
            Spacer(modifier = GlanceModifier.height(6.dp))
            Text(
                "촬영",
                style = TextStyle(
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = widgetAccentText,
                ),
            )
        }
    }
}

@Composable
private fun ShutterBar() {
    Box(
        modifier = GlanceModifier
            .fillMaxWidth()
            .height(64.dp)
            .background(widgetAccent)
            .cornerRadius(12.dp)
            .clickable(actionStartActivity(cameraIntent())),
        contentAlignment = Alignment.CenterStart,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = GlanceModifier.padding(horizontal = 12.dp),
        ) {
            Image(
                provider = ImageProvider(R.drawable.ic_app_logo),
                contentDescription = "스냅넘버",
                contentScale = ContentScale.Fit,
                modifier = GlanceModifier.width(40.dp).height(40.dp).cornerRadius(10.dp),
            )
            Spacer(modifier = GlanceModifier.width(12.dp))
            Column {
                Text(
                    "이체 계좌 촬영",
                    style = TextStyle(
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = widgetAccentText,
                    ),
                )
                Text(
                    "이체할 계좌를 사진으로 인식",
                    style = TextStyle(fontSize = 10.sp, color = widgetAccentSubText),
                )
            }
        }
    }
}

@Composable
private fun FavoriteRow(a: WidgetAccount) {
    Box(
        modifier = GlanceModifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable(actionStartActivity(copyIntent(a.id)))
    ) {
        Column {
            Text(
                a.label ?: a.bankName,
                style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Bold),
                maxLines = 1,
            )
            Text(
                "${a.bankName} · ${formatAccountByBank(a.accountNumber, a.bankCode)}",
                style = TextStyle(
                    fontSize = 11.sp,
                    color = GlanceTheme.colors.onSurfaceVariant,
                ),
                maxLines = 1,
            )
        }
    }
}

class AccountWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = AccountWidget()
}
