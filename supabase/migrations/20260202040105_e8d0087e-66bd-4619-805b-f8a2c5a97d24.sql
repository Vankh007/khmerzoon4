-- Create user_notifications table for content update notifications to users
CREATE TABLE public.user_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
    episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
    poster_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON public.user_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.user_notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.user_notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins/system can insert notifications for any user
CREATE POLICY "System can insert notifications"
ON public.user_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX idx_user_notifications_created_at ON public.user_notifications(created_at DESC);
CREATE INDEX idx_user_notifications_is_read ON public.user_notifications(is_read);

-- Function to notify all users when content is updated
CREATE OR REPLACE FUNCTION public.notify_users_on_content_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_record RECORD;
    notification_title TEXT;
    notification_message TEXT;
    content_type_label TEXT;
BEGIN
    -- Determine content type label
    content_type_label := CASE 
        WHEN NEW.content_type = 'movie' THEN 'Movie'
        WHEN NEW.content_type = 'series' THEN 'Series'
        WHEN NEW.content_type = 'anime' THEN 'Anime'
        ELSE 'Content'
    END;
    
    -- Check if this is a significant update (title, poster, or new content)
    IF TG_OP = 'INSERT' THEN
        notification_title := 'New ' || content_type_label || ' Added';
        notification_message := NEW.title || ' has been added. Watch now!';
    ELSIF TG_OP = 'UPDATE' AND (OLD.title IS DISTINCT FROM NEW.title OR OLD.poster_path IS DISTINCT FROM NEW.poster_path OR OLD.last_content_update IS DISTINCT FROM NEW.last_content_update) THEN
        notification_title := content_type_label || ' Updated';
        notification_message := NEW.title || ' has been updated with new content.';
    ELSE
        -- Skip minor updates
        RETURN NEW;
    END IF;
    
    -- Insert notification for all users (batch insert from profiles)
    INSERT INTO public.user_notifications (user_id, type, title, message, content_id, poster_url)
    SELECT 
        p.id,
        'content_update',
        notification_title,
        notification_message,
        NEW.id,
        NEW.poster_path
    FROM public.profiles p
    WHERE p.id IS NOT NULL;
    
    RETURN NEW;
END;
$$;

-- Function to notify all users when a new episode is added
CREATE OR REPLACE FUNCTION public.notify_users_on_episode_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    content_record RECORD;
    notification_title TEXT;
    notification_message TEXT;
BEGIN
    -- Only trigger on new episodes
    IF TG_OP = 'INSERT' THEN
        -- Get content info
        SELECT title, poster_path, content_type INTO content_record
        FROM public.content
        WHERE id = NEW.show_id;
        
        IF content_record IS NOT NULL THEN
            notification_title := 'New Episode Available';
            notification_message := content_record.title || ' - Episode ' || NEW.episode_number || ' is now available!';
            
            -- Insert notification for all users
            INSERT INTO public.user_notifications (user_id, type, title, message, content_id, episode_id, poster_url)
            SELECT 
                p.id,
                'new_episode',
                notification_title,
                notification_message,
                NEW.show_id,
                NEW.id,
                COALESCE(NEW.still_path, content_record.poster_path)
            FROM public.profiles p
            WHERE p.id IS NOT NULL;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create triggers for content updates
CREATE TRIGGER trigger_notify_users_content_update
AFTER INSERT OR UPDATE ON public.content
FOR EACH ROW
EXECUTE FUNCTION public.notify_users_on_content_update();

-- Create trigger for new episodes
CREATE TRIGGER trigger_notify_users_episode_insert
AFTER INSERT ON public.episodes
FOR EACH ROW
EXECUTE FUNCTION public.notify_users_on_episode_update();

-- Function to notify admin on user registration
CREATE OR REPLACE FUNCTION public.notify_admin_on_user_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.admin_notifications (type, title, message, severity, metadata)
    VALUES (
        'user_registration',
        'New User Registration',
        'A new user has registered: User #' || LEFT(NEW.id::text, 8),
        'info',
        jsonb_build_object('user_id', NEW.id, 'username', NEW.username, 'full_name', NEW.full_name)
    );
    RETURN NEW;
END;
$$;

-- Function to notify admin on content interactions (like, dislike, add to list)
CREATE OR REPLACE FUNCTION public.notify_admin_on_content_interaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    content_record RECORD;
    action_label TEXT;
BEGIN
    -- Get content info
    SELECT title INTO content_record FROM public.content WHERE id = NEW.content_id;
    
    action_label := CASE NEW.interaction_type
        WHEN 'like' THEN 'liked'
        WHEN 'dislike' THEN 'disliked'
        ELSE NEW.interaction_type
    END;
    
    INSERT INTO public.admin_notifications (type, title, message, severity, metadata)
    VALUES (
        'content_interaction',
        'Content ' || INITCAP(action_label),
        'User ' || action_label || ' "' || COALESCE(content_record.title, 'Unknown') || '"',
        'info',
        jsonb_build_object('user_id', NEW.user_id, 'content_id', NEW.content_id, 'interaction_type', NEW.interaction_type)
    );
    RETURN NEW;
END;
$$;

-- Function to notify admin on comments
CREATE OR REPLACE FUNCTION public.notify_admin_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    content_record RECORD;
BEGIN
    SELECT title INTO content_record FROM public.content WHERE id = NEW.content_id;
    
    INSERT INTO public.admin_notifications (type, title, message, severity, metadata)
    VALUES (
        'new_comment',
        'New Comment',
        'User commented on "' || COALESCE(content_record.title, 'Unknown') || '"',
        'info',
        jsonb_build_object('user_id', NEW.user_id, 'content_id', NEW.content_id, 'comment_id', NEW.id, 'content_preview', LEFT(NEW.content, 100))
    );
    RETURN NEW;
END;
$$;

-- Function to notify admin on my_list additions
CREATE OR REPLACE FUNCTION public.notify_admin_on_mylist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    content_record RECORD;
BEGIN
    SELECT title INTO content_record FROM public.content WHERE id = NEW.content_id;
    
    INSERT INTO public.admin_notifications (type, title, message, severity, metadata)
    VALUES (
        'watchlist_add',
        'Added to Watchlist',
        'User added "' || COALESCE(content_record.title, 'Unknown') || '" to their watchlist',
        'info',
        jsonb_build_object('user_id', NEW.user_id, 'content_id', NEW.content_id)
    );
    RETURN NEW;
END;
$$;

-- Function to notify admin on purchases
CREATE OR REPLACE FUNCTION public.notify_admin_on_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    content_record RECORD;
BEGIN
    SELECT title INTO content_record FROM public.content WHERE id = NEW.content_id;
    
    INSERT INTO public.admin_notifications (type, title, message, severity, metadata)
    VALUES (
        'content_purchase',
        'Content Purchased',
        'User purchased "' || COALESCE(content_record.title, 'Unknown') || '" for $' || NEW.price,
        'success',
        jsonb_build_object('user_id', NEW.user_id, 'content_id', NEW.content_id, 'price', NEW.price)
    );
    RETURN NEW;
END;
$$;

-- Function to notify admin on subscription
CREATE OR REPLACE FUNCTION public.notify_admin_on_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.admin_notifications (type, title, message, severity, metadata)
    VALUES (
        'new_subscription',
        'New Subscription',
        'User subscribed to a membership plan',
        'success',
        jsonb_build_object('user_id', NEW.user_id, 'plan_id', NEW.plan_id, 'amount', NEW.amount)
    );
    RETURN NEW;
END;
$$;

-- Function to notify admin on wallet top-up
CREATE OR REPLACE FUNCTION public.notify_admin_on_topup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        INSERT INTO public.admin_notifications (type, title, message, severity, metadata)
        VALUES (
            'wallet_topup',
            'Wallet Top-up',
            'User topped up $' || NEW.amount || ' to their wallet',
            'success',
            jsonb_build_object('user_id', NEW.user_id, 'amount', NEW.amount, 'transaction_id', NEW.id)
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Function to notify admin on reports
CREATE OR REPLACE FUNCTION public.notify_admin_on_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    content_record RECORD;
BEGIN
    SELECT title INTO content_record FROM public.content WHERE id = NEW.content_id;
    
    INSERT INTO public.admin_notifications (type, title, message, severity, metadata)
    VALUES (
        'new_report',
        'New Report: ' || INITCAP(REPLACE(NEW.report_type, '_', ' ')),
        'User reported "' || COALESCE(content_record.title, 'Unknown') || '": ' || LEFT(NEW.description, 50),
        'warning',
        jsonb_build_object('user_id', NEW.user_id, 'content_id', NEW.content_id, 'report_id', NEW.id, 'report_type', NEW.report_type)
    );
    RETURN NEW;
END;
$$;

-- Create triggers for admin notifications
CREATE TRIGGER trigger_notify_admin_user_registration
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_user_registration();

CREATE TRIGGER trigger_notify_admin_content_interaction
AFTER INSERT ON public.content_interactions
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_content_interaction();

CREATE TRIGGER trigger_notify_admin_comment
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_comment();

CREATE TRIGGER trigger_notify_admin_mylist
AFTER INSERT ON public.my_list
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_mylist();

CREATE TRIGGER trigger_notify_admin_purchase
AFTER INSERT ON public.content_purchases
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_purchase();

CREATE TRIGGER trigger_notify_admin_topup
AFTER INSERT OR UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_topup();

CREATE TRIGGER trigger_notify_admin_report
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_report();