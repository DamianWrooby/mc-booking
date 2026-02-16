-- Trigger function: New assignment -> notify user
CREATE OR REPLACE FUNCTION public.on_job_assignment_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_job_title TEXT;
BEGIN
    SELECT title INTO v_job_title FROM public."Job" WHERE id = NEW.job_id;

    INSERT INTO public."Notification" (user_id, title, message, type, job_id, is_read)
    VALUES (
        NEW.user_id,
        'Nowe przypisanie',
        'Przypisano do: ' || COALESCE(v_job_title, 'Praca'),
        'job_assigned',
        NEW.job_id,
        false
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for job assignment insert
DROP TRIGGER IF EXISTS trg_job_assignment_insert ON public."JobAssignment";
CREATE TRIGGER trg_job_assignment_insert
    AFTER INSERT ON public."JobAssignment"
    FOR EACH ROW EXECUTE FUNCTION public.on_job_assignment_insert();

-- Trigger function: Assignment removed -> notify user
CREATE OR REPLACE FUNCTION public.on_job_assignment_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_job_title TEXT;
BEGIN
    SELECT title INTO v_job_title FROM public."Job" WHERE id = OLD.job_id;

    INSERT INTO public."Notification" (user_id, title, message, type, job_id, is_read)
    VALUES (
        OLD.user_id,
        'Usunięto z pracy',
        'Usunięto z: ' || COALESCE(v_job_title, 'Praca'),
        'job_unassigned',
        OLD.job_id,
        false
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for job assignment delete
DROP TRIGGER IF EXISTS trg_job_assignment_delete ON public."JobAssignment";
CREATE TRIGGER trg_job_assignment_delete
    AFTER DELETE ON public."JobAssignment"
    FOR EACH ROW EXECUTE FUNCTION public.on_job_assignment_delete();

-- Trigger function: Job updated -> notify all assigned users
CREATE OR REPLACE FUNCTION public.on_job_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify if significant fields changed
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.start_date IS DISTINCT FROM OLD.start_date
       OR NEW.end_date IS DISTINCT FROM OLD.end_date
       OR NEW.location IS DISTINCT FROM OLD.location THEN

        INSERT INTO public."Notification" (user_id, title, message, type, job_id, is_read)
        SELECT
            ja.user_id,
            'Aktualizacja pracy',
            'Zaktualizowano: ' || NEW.title,
            'job_updated',
            NEW.id,
            false
        FROM public."JobAssignment" ja
        WHERE ja.job_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for job update
DROP TRIGGER IF EXISTS trg_job_update ON public."Job";
CREATE TRIGGER trg_job_update
    AFTER UPDATE ON public."Job"
    FOR EACH ROW EXECUTE FUNCTION public.on_job_update();

-- Trigger function: Job deleted -> notify all assigned users (BEFORE delete to access assignments)
CREATE OR REPLACE FUNCTION public.on_job_delete()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public."Notification" (user_id, title, message, type, is_read)
    SELECT
        ja.user_id,
        'Praca usunięta',
        'Usunięto: ' || OLD.title,
        'job_deleted',
        false
    FROM public."JobAssignment" ja
    WHERE ja.job_id = OLD.id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for job delete (BEFORE to access assignments before cascade)
DROP TRIGGER IF EXISTS trg_job_delete ON public."Job";
CREATE TRIGGER trg_job_delete
    BEFORE DELETE ON public."Job"
    FOR EACH ROW EXECUTE FUNCTION public.on_job_delete();
