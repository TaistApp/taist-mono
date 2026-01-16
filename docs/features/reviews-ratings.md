# Review & Rating System

Documentation of customer reviews, chef ratings, and AI-generated review features.

---

## Table of Contents

1. [Overview](#overview)
2. [Data Model](#data-model)
3. [Submitting Reviews](#submitting-reviews)
4. [Rating Calculations](#rating-calculations)
5. [AI-Generated Reviews](#ai-generated-reviews)
6. [Displaying Reviews](#displaying-reviews)

---

## Overview

The review system enables:
- Customer ratings (1-5 stars) for completed orders
- Written reviews
- Chef responses
- AI-generated review suggestions (admin tool)

**Related Files:**
- Model: `backend/app/Models/Reviews.php`
- Controller: `backend/app/Http/Controllers/MapiController.php`
- Frontend: `frontend/app/screens/customer/orderDetail/`

---

## Data Model

### Reviews Table

```sql
CREATE TABLE tbl_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    from_user_id INT NOT NULL,      -- Customer who left review
    to_user_id INT NOT NULL,        -- Chef being reviewed
    rating FLOAT NOT NULL,          -- 1.0 - 5.0
    review TEXT,                    -- Written review
    tip_amount DECIMAL(10,2),       -- Tip with review
    source ENUM('customer', 'ai_generated') DEFAULT 'customer',
    parent_review_id INT NULL,      -- For AI variants
    ai_generation_params JSON,      -- AI generation metadata
    created_at TIMESTAMP,
    updated_at TIMESTAMP,

    INDEX idx_reviews_chef (to_user_id),
    INDEX idx_reviews_order (order_id)
);
```

### TypeScript Interface

```typescript
interface IReview {
  id?: number;
  order_id: number;
  from_user_id: number;
  to_user_id: number;
  rating: number;
  review?: string;
  tip_amount?: number;
  source: 'customer' | 'ai_generated';
  parent_review_id?: number;
  ai_generation_params?: object;
  created_at: number;
  updated_at: number;
}
```

---

## Submitting Reviews

### API Endpoint

```
POST /create_review
```

**Request:**
```json
{
  "order_id": 123,
  "from_user_id": 456,
  "to_user_id": 789,
  "rating": 5,
  "review": "Amazing food! Will order again.",
  "tip_amount": 5.00
}
```

### Backend Implementation

```php
// MapiController@createReview
public function createReview(Request $request)
{
    $validator = Validator::make($request->all(), [
        'order_id' => 'required|exists:tbl_orders,id',
        'from_user_id' => 'required|exists:tbl_users,id',
        'to_user_id' => 'required|exists:tbl_users,id',
        'rating' => 'required|numeric|min:1|max:5',
        'review' => 'nullable|string|max:1000',
        'tip_amount' => 'nullable|numeric|min:0',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'error' => $validator->errors()->first(),
        ], 400);
    }

    // Check if review already exists for this order
    $existing = Reviews::where('order_id', $request->order_id)
        ->where('from_user_id', $request->from_user_id)
        ->first();

    if ($existing) {
        return response()->json([
            'success' => false,
            'error' => 'You have already reviewed this order',
        ], 400);
    }

    $review = Reviews::create([
        'order_id' => $request->order_id,
        'from_user_id' => $request->from_user_id,
        'to_user_id' => $request->to_user_id,
        'rating' => $request->rating,
        'review' => $request->review,
        'tip_amount' => $request->tip_amount,
        'source' => 'customer',
    ]);

    // Process tip if provided
    if ($request->tip_amount > 0) {
        $this->processTipPayment($request->order_id, $request->tip_amount);
    }

    return response()->json([
        'success' => true,
        'data' => $review,
    ]);
}
```

### Frontend Implementation

```typescript
// In orderDetail screen
const [rating, setRating] = useState(0);
const [reviewText, setReviewText] = useState('');
const [tipAmount, setTipAmount] = useState(0);

const handleSubmitReview = async () => {
  if (rating === 0) {
    ShowErrorToast('Please select a rating');
    return;
  }

  dispatch(showLoading());

  const resp = await CreateReviewAPI({
    order_id: order.id,
    from_user_id: self.id,
    to_user_id: order.chef_user_id,
    rating,
    review: reviewText,
    tip_amount: tipAmount,
  });

  dispatch(hideLoading());

  if (resp.success) {
    ShowSuccessToast('Review submitted!');
    setHasReviewed(true);
  } else {
    ShowErrorToast(resp.error || 'Failed to submit review');
  }
};
```

### Star Rating Component

```typescript
const StarRating = ({ rating, onRate, readonly = false }) => {
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity
          key={star}
          onPress={() => !readonly && onRate(star)}
          disabled={readonly}
        >
          <StarIcon
            filled={star <= rating}
            color={star <= rating ? '#FFD700' : '#CCCCCC'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

---

## Rating Calculations

### Average Rating

```php
// MapiController@getAVGRating
public function getAVGRating(Request $request)
{
    $avgRating = Reviews::where('to_user_id', $request->user_id)
        ->avg('rating');

    $reviewCount = Reviews::where('to_user_id', $request->user_id)->count();

    return response()->json([
        'success' => true,
        'data' => [
            'avg_rating' => round($avgRating, 1) ?? 0,
            'review_count' => $reviewCount,
        ],
    ]);
}
```

### Rating Distribution

```php
// Get rating breakdown
$distribution = Reviews::where('to_user_id', $chefId)
    ->selectRaw('rating, COUNT(*) as count')
    ->groupBy('rating')
    ->pluck('count', 'rating');

// Result: [5 => 10, 4 => 5, 3 => 2, 2 => 1, 1 => 0]
```

---

## AI-Generated Reviews

### Purpose

Admins can generate AI-powered reviews based on authentic customer feedback to help chefs with limited reviews.

### API Endpoint

```
POST /generate-ai-reviews
```

**Request:**
```json
{
  "chef_id": 789,
  "menu_id": 123,
  "parent_review_id": 456
}
```

### Backend Implementation

```php
// MapiController@generateAIReviews
public function generateAIReviews(Request $request)
{
    $parentReview = Reviews::find($request->parent_review_id);
    $menu = Menus::find($request->menu_id);
    $chef = Listener::find($request->chef_id);

    $openai = new OpenAIService();

    $prompt = "Generate a variation of this restaurant review for a dish called '{$menu->title}'.
               Original review: \"{$parentReview->review}\"
               Rating: {$parentReview->rating}/5

               Write a similar but unique review that:
               - Maintains the same sentiment
               - Mentions specific aspects of the dish
               - Sounds authentic and natural
               - Is 2-3 sentences long";

    $generatedReview = $openai->chat($prompt);

    $review = Reviews::create([
        'order_id' => $parentReview->order_id,
        'from_user_id' => $parentReview->from_user_id,
        'to_user_id' => $request->chef_id,
        'rating' => $parentReview->rating,
        'review' => $generatedReview,
        'source' => 'ai_generated',
        'parent_review_id' => $request->parent_review_id,
        'ai_generation_params' => [
            'menu_id' => $request->menu_id,
            'chef_id' => $request->chef_id,
            'model' => 'gpt-5-mini',
            'generated_at' => now()->toISOString(),
        ],
    ]);

    return response()->json([
        'success' => true,
        'data' => $review,
    ]);
}
```

### Admin Review Creation

```php
// AdminapiController@createAuthenticReview
public function createAuthenticReview(Request $request)
{
    // Manually create an "authentic" review (admin tool)
    $review = Reviews::create([
        'order_id' => $request->order_id,
        'from_user_id' => $request->from_user_id,
        'to_user_id' => $request->to_user_id,
        'rating' => $request->rating,
        'review' => $request->review,
        'source' => 'customer', // Marked as customer even though admin created
    ]);

    return response()->json(['success' => true, 'data' => $review]);
}
```

---

## Displaying Reviews

### Get Reviews for Chef

```
GET /get_reviews_by_user_id?user_id={chef_id}
```

```php
// MapiController@getReviewsByUserID
public function getReviewsByUserID(Request $request)
{
    $reviews = Reviews::where('to_user_id', $request->user_id)
        ->with('reviewer:id,first_name,last_name,photo')
        ->orderBy('created_at', 'desc')
        ->get();

    return response()->json([
        'success' => true,
        'data' => $reviews,
    ]);
}
```

### Frontend Display

**Chef Feedback Screen:** `frontend/app/screens/chef/feedback/`

```typescript
const FeedbackScreen = () => {
  const self = useAppSelector(x => x.user.user);
  const [reviews, setReviews] = useState<IReview[]>([]);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    const [reviewsResp, ratingResp] = await Promise.all([
      GetReviewsByUserIdAPI({ user_id: self.id }),
      GetAVGRatingAPI({ user_id: self.id }),
    ]);

    if (reviewsResp.success) setReviews(reviewsResp.data);
    if (ratingResp.success) setAvgRating(ratingResp.data.avg_rating);
  };

  return (
    <Container>
      {/* Rating Summary */}
      <View style={styles.summary}>
        <Text style={styles.avgRating}>{avgRating.toFixed(1)}</Text>
        <StarRating rating={Math.round(avgRating)} readonly />
        <Text style={styles.reviewCount}>{reviews.length} reviews</Text>
      </View>

      {/* Review List */}
      <FlatList
        data={reviews}
        renderItem={({ item }) => <ReviewCard review={item} />}
        keyExtractor={item => item.id.toString()}
        ListEmptyComponent={<EmptyState title="No reviews yet" />}
      />
    </Container>
  );
};
```

### Review Card Component

```typescript
const ReviewCard = ({ review }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image source={{ uri: review.reviewer.photo }} style={styles.avatar} />
        <View>
          <Text style={styles.name}>
            {review.reviewer.first_name} {review.reviewer.last_name.charAt(0)}.
          </Text>
          <Text style={styles.date}>{formatDate(review.created_at)}</Text>
        </View>
        <StarRating rating={review.rating} readonly size="small" />
      </View>

      {review.review && (
        <Text style={styles.reviewText}>{review.review}</Text>
      )}
    </View>
  );
};
```

---

## Review Validation

### Eligibility Check

Reviews can only be submitted for:
- Completed orders (status = 3)
- Orders by the reviewing customer
- Orders not already reviewed

```typescript
const canReview = (order: IOrder, userId: number) => {
  return (
    order.status === 3 &&
    order.customer_user_id === userId &&
    !order.hasReview
  );
};
```

### Review Period

Consider limiting reviews to a certain timeframe:

```php
// Only allow reviews within 30 days
$order = Orders::find($request->order_id);
$orderDate = Carbon::parse($order->updated_at);

if ($orderDate->diffInDays(now()) > 30) {
    return response()->json([
        'success' => false,
        'error' => 'Review period has expired',
    ], 400);
}
```
